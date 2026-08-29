"""
เขียนผลการอัปโหลดเรซูเม่ลง Supabase

หลักที่ยึดไว้: **DB ล่มต้องไม่ทำให้ผู้ใช้อัปโหลดไม่ได้**

ตอน pitch อินเทอร์เน็ตห้องประชุมเป็นตัวแปรที่เราคุมไม่ได้ ถ้า Supabase ต่อไม่ติด
แล้วทั้งฟีเจอร์พังตามไปด้วย = จบเลย เลยออกแบบให้ทุกฟังก์ชันในไฟล์นี้
คืน None แทนการโยน exception ส่วนที่เรียกใช้แค่บันทึก log แล้วไปต่อ
ผู้ใช้ยังเห็นทักษะที่สกัดได้ครบ แค่ไม่ได้บันทึกลงฐานข้อมูล
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

log = logging.getLogger(__name__)

_warned_no_dsn = False


def _dsn() -> str:
    from dotenv import load_dotenv

    load_dotenv()
    return os.getenv("DATABASE_URL", "").strip()


def connect():
    """คืน connection หรือ None ถ้าต่อไม่ได้ — ไม่โยน exception ออกไป"""
    global _warned_no_dsn

    dsn = _dsn()
    if not dsn:
        if not _warned_no_dsn:
            log.warning(
                "ยังไม่ได้ตั้ง DATABASE_URL — จะไม่บันทึกผลลง Supabase "
                "(ระบบยังทำงานได้ปกติ แค่ไม่มีประวัติย้อนหลัง)"
            )
            _warned_no_dsn = True
        return None

    try:
        import psycopg

        return psycopg.connect(dsn, connect_timeout=10)
    except Exception as exc:  # noqa: BLE001 — ต่อ DB ไม่ได้ต้องไม่ทำให้ request พัง
        log.warning("ต่อ Supabase ไม่ได้ (%s) — ข้ามการบันทึก", type(exc).__name__)
        return None


def save_resume(
    *,
    external_user_id: str | None,
    filename: str,
    redacted_text: str,
    ocr_used: bool,
    extract_method: str,
    n_pages: int,
    redaction_report: dict[str, Any],
    spans: list[dict[str, Any]],
    model_version: str,
) -> str | None:
    """
    บันทึกหลักฐาน 1 ชิ้น + ทักษะที่สกัดได้ ในทรานแซกชันเดียว คืน source_id

    ทำไมต้องอยู่ทรานแซกชันเดียว: ถ้าเขียน evidence สำเร็จแต่ skills ล้ม
    จะเหลือหลักฐานที่ไม่มีทักษะผูกอยู่ แล้วหน้าเว็บจะโชว์ "อัปโหลดแล้วแต่ไม่เจอทักษะ"
    ทั้งที่จริง ๆ สกัดได้ — debug ยากมากเพราะดูจากผลลัพธ์แล้วเหมือนโมเดลไม่ทำงาน
    """
    # ยืนยันอีกชั้นก่อนแตะ DB — ต่อให้ผู้เรียกลืม redact ก็ต้องไม่หลุดตรงนี้
    # (ฝั่ง Postgres มี CHECK ซ้ำอีกที ดู db/004_resume_upload.sql)
    if "@" in redacted_text and _looks_like_email(redacted_text):
        log.error("พบอีเมลในข้อความที่กำลังจะบันทึก — ยกเลิกการเขียน")
        return None

    conn = connect()
    if conn is None:
        return None

    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO evidence_sources
                    (external_user_id, kind, raw_text, ocr_used,
                     filename, extract_method, n_pages, redaction_report)
                VALUES (%s, 'resume', %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    external_user_id,
                    redacted_text,
                    ocr_used,
                    filename,
                    extract_method,
                    n_pages,
                    json.dumps(redaction_report, ensure_ascii=False),
                ),
            )
            source_id = cur.fetchone()[0]

            if spans:
                cur.executemany(
                    """
                    INSERT INTO extracted_skills
                        (external_user_id, source_id, surface_text, span_label,
                         char_start, char_end, confidence, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        (
                            external_user_id,
                            source_id,
                            s["surface_text"],
                            s["label"],
                            s["char_start"],
                            s["char_end"],
                            s["confidence"],
                            model_version,
                        )
                        for s in spans
                    ],
                )

        log.info("บันทึกเรซูเม่ %s (%d ทักษะ) -> %s", filename, len(spans), source_id)
        return str(source_id)

    except Exception as exc:  # noqa: BLE001
        log.warning("บันทึกลง Supabase ไม่สำเร็จ (%s) — ผู้ใช้ยังใช้งานต่อได้", exc)
        return None
    finally:
        conn.close()


def _looks_like_email(text: str) -> bool:
    import re

    return bool(re.search(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}", text))


def recent_uploads(external_user_id: str, limit: int = 5) -> list[dict]:
    """ประวัติการอัปโหลดของผู้ใช้คนหนึ่ง — หน้าโปรไฟล์เรียกใช้"""
    conn = connect()
    if conn is None:
        return []
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, filename, extract_method, ocr_used,
                       redaction_report, created_at
                FROM evidence_sources
                WHERE kind = 'resume' AND external_user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (external_user_id, limit),
            )
            cols = [d.name for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]
    except Exception as exc:  # noqa: BLE001
        log.warning("อ่านประวัติไม่สำเร็จ: %s", exc)
        return []
    finally:
        conn.close()
