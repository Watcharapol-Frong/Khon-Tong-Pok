"""
โหลดข้อมูลขึ้น Supabase (Postgres)

    python db/load_to_supabase.py --what schema            # สร้างตารางครั้งแรก
    python db/load_to_supabase.py --what labeled           # label ที่คนระบาย
    python db/load_to_supabase.py --what taxonomy          # คลังทักษะ
    python db/load_to_supabase.py --what corpus --limit 200
    python db/load_to_supabase.py --what all --dry-run

--------------------------------------------------------------------------
สิ่งที่ควร / ไม่ควรลง DB

ลง:      label ที่คนระบาย, skill_taxonomy, ผลสกัดของผู้ใช้จริง, ผลเกม
ไม่ลง:   corpus ภาษาอังกฤษเต็มชุด, augmented 10,000, บทสัมภาษณ์ 1,200

เหตุผล: Supabase free tier ให้ 500 MB และของสามอย่างหลังคือ "ข้อมูลเทรน"
ที่ตัวผลิตภัณฑ์ไม่เคย query เลย เก็บเป็นไฟล์ถูกกว่าและ backup ง่ายกว่า
สคริปต์นี้จะเตือนถ้าสั่งโหลดของที่ไม่ควรลง แต่ไม่ห้าม

--------------------------------------------------------------------------
label ของคนไปอยู่ตารางไหน

ไปอยู่ที่ extracted_skills เหมือนผลจากโมเดล แต่ตั้ง
    model_version = 'human-label-v1'
    status        = 'confirmed'

ทำแบบนี้เพราะ **หน้าเว็บที่ไฮไลต์ทักษะกลับไปที่ประโยคต้นทางจะทำงานได้ทันที**
โดยไม่ต้องรอโมเดลเทรนเสร็จ และตอนโมเดลพร้อมก็เทียบผลกับของคนได้ตรง ๆ
ในตารางเดียวกันด้วย
--------------------------------------------------------------------------
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train.paths import CORPUS_FILE, DATA_ROOT, LABELED_DIR  # noqa: E402

SQL_FILES = {
    "schema": Path(__file__).parent / "001_schema.sql",
    "security": Path(__file__).parent / "002_security.sql",
    "seed": Path(__file__).parent / "003_seed.sql",
}
SCHEMA_SQL = SQL_FILES["schema"]

# namespace คงที่ -> uuid เดิมทุกครั้งที่รัน = รันซ้ำได้ไม่เกิดข้อมูลซ้ำ
NS = uuid.UUID("6ba7b812-9dad-11d1-80b4-00c04fd430c8")

ANNOTATOR_EMAIL = "annotator@khontongpok.local"
HUMAN_MODEL_VERSION = "human-label-v1"


def det_uuid(*parts: str) -> uuid.UUID:
    return uuid.uuid5(NS, "|".join(parts))


# ---------------------------------------------------------------------------
def get_dsn() -> str:
    from dotenv import load_dotenv

    load_dotenv()
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        raise SystemExit(
            "ยังไม่ได้ตั้ง DATABASE_URL ใน .env\n\n"
            "หาได้จาก Supabase: Project Settings -> Database -> Connection string\n"
            "  **เลือก 'Session pooler' ไม่ใช่ 'Direct connection'**\n"
            "  เพราะ direct connection ของ Supabase เป็น IPv6 อย่างเดียว\n"
            "  เน็ตบ้านไทยส่วนใหญ่ต่อไม่ได้ แล้วจะงงว่าทำไม timeout\n\n"
            "หน้าตาประมาณนี้:\n"
            "  DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1"
            ".pooler.supabase.com:5432/postgres"
        )
    return dsn


def connect(dsn: str):
    import psycopg

    try:
        return psycopg.connect(dsn, connect_timeout=15)
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(
            f"ต่อฐานข้อมูลไม่ได้: {exc}\n\n"
            "เช็ค 3 อย่าง:\n"
            "  1. ใช้ Session pooler ไม่ใช่ direct connection (เรื่อง IPv6)\n"
            "  2. รหัสผ่านในสตริงถูกต้อง และ escape อักขระพิเศษแล้ว\n"
            "  3. โปรเจกต์ Supabase ยังไม่ถูก pause (free tier จะ pause ถ้าไม่ใช้ 7 วัน)"
        ) from exc


# ---------------------------------------------------------------------------
def read_jsonl(path: Path) -> list[dict]:
    # วนไฟล์ทีละบรรทัด ห้าม splitlines() — ดู tests/test_augment.py
    with path.open(encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def load_labeled_rows() -> list[dict]:
    files = [p for p in sorted(LABELED_DIR.glob("*.jsonl")) if p.stem not in {"train", "dev", "test"}]
    rows = []
    for path in files:
        for i, row in enumerate(read_jsonl(path)):
            row["_source"] = f"{path.stem}:{i}"
            row["_annotator"] = path.stem
            rows.append(row)
    return rows


# ---------------------------------------------------------------------------
def run_sql_file(conn, key: str, dry: bool) -> None:
    """รันไฟล์ .sql ทั้งไฟล์ — ทุกไฟล์เขียนให้รันซ้ำได้แล้ว"""
    path = SQL_FILES[key]
    sql = path.read_text(encoding="utf-8")
    print(f"รัน {path.name} ({len(sql):,} ตัวอักษร)")
    if dry:
        print("  [dry-run] ข้าม")
        return

    with conn.cursor() as cur:
        try:
            cur.execute(sql)
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            msg = str(exc)
            if "extension" in msg and "vector" in msg:
                raise SystemExit(
                    "เปิด pgvector ไม่ได้\n"
                    "ไปที่ Supabase -> Database -> Extensions แล้วเปิด 'vector' ก่อนครับ"
                ) from exc
            if "permission denied" in msg and key == "security":
                raise SystemExit(
                    "สิทธิ์ไม่พอสำหรับตั้ง RLS\n"
                    "ต้องต่อด้วย connection string ของ postgres (ไม่ใช่ anon key)\n"
                    "หรือวางไฟล์ db/002_security.sql ใน Supabase SQL Editor แทน"
                ) from exc
            raise
    conn.commit()
    print(f"  ✓ {path.name} เรียบร้อย")


def cmd_schema(conn, dry: bool) -> None:
    run_sql_file(conn, "schema", dry)


def ensure_annotator(conn, dry: bool) -> uuid.UUID:
    """ผู้ใช้ระบบสำหรับถือ label ที่คนระบาย (evidence_sources ต้องมีเจ้าของ)"""
    uid = det_uuid("user", ANNOTATOR_EMAIL)
    if dry:
        return uid
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (id, email, role) VALUES (%s, %s, 'admin') "
            "ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id",
            (uid, ANNOTATOR_EMAIL),
        )
        got = cur.fetchone()[0]
    conn.commit()
    return got


# ---------------------------------------------------------------------------
def cmd_taxonomy(conn, dry: bool) -> None:
    """
    สร้างคลังทักษะจากคำที่คนระบายไว้

    ยังไม่ทำ embedding ตรงนี้ เพราะต้องโหลดโมเดล WangchanBERTa (~420 MB)
    ซึ่งตอนนี้ดิสก์ไม่พอ — เติมทีหลังด้วย --what embed ได้
    """
    rows = load_labeled_rows()
    if not rows:
        print("ยังไม่มีไฟล์ label — ข้าม taxonomy")
        return

    seen: dict[tuple[str, str], int] = {}
    for row in rows:
        for ent in row.get("entities", []):
            surface = row["text"][ent["start"] : ent["end"]].strip()
            if surface:
                key = (surface.lower(), ent["label"])
                seen[key] = seen.get(key, 0) + 1

    print(f"เจอทักษะไม่ซ้ำ {len(seen)} รายการ จาก {len(rows)} ประโยค")
    for (surface, label), n in sorted(seen.items(), key=lambda kv: -kv[1])[:8]:
        print(f"    {label:<6} {surface:<32} เจอ {n} ครั้ง")
    if len(seen) > 8:
        print(f"    ... และอีก {len(seen) - 8} รายการ")

    if dry:
        return

    payload = [
        (
            f"{label.lower()}:{surface.replace(' ', '-')[:60]}",
            surface,
            surface,
            "hard" if label == "KNOW" else "soft",
        )
        for (surface, label) in seen
    ]
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO skill_taxonomy (code, name_th, name_en, type) "
            "VALUES (%s, %s, %s, %s) ON CONFLICT (code) DO NOTHING",
            payload,
        )
    conn.commit()
    print(f"  ✓ ใส่ skill_taxonomy แล้ว")


def cmd_labeled(conn, dry: bool) -> None:
    rows = load_labeled_rows()
    if not rows:
        print(f"ไม่พบไฟล์ .jsonl ใน {LABELED_DIR}")
        print("  เขียน label แล้วรัน: python train/markup_to_jsonl.py ../data/labeled/ชื่อคุณ.md")
        return

    n_spans = sum(len(r.get("entities", [])) for r in rows)
    annotators = {r["_annotator"] for r in rows}
    print(f"label: {len(rows)} ประโยค · {n_spans} span · จาก {len(annotators)} คน ({', '.join(sorted(annotators))})")

    if dry:
        print("  [dry-run] ไม่ได้เขียนจริง")
        return

    uid = ensure_annotator(conn, dry)

    # ต้องมี taxonomy ก่อนถึงจะ map skill_id ได้
    with conn.cursor() as cur:
        cur.execute("SELECT lower(name_en), id FROM skill_taxonomy")
        tax = dict(cur.fetchall())

    sources, spans = [], []
    for row in rows:
        sid = det_uuid("evidence", row["_source"])
        sources.append((sid, uid, "resume", row["text"], False))
        for ent in row.get("entities", []):
            surface = row["text"][ent["start"] : ent["end"]].strip()
            if not surface:
                continue
            spans.append(
                (
                    uid,
                    tax.get(surface.lower()),
                    sid,
                    surface,
                    ent["label"],
                    ent["start"],
                    ent["end"],
                    1.0,  # คนระบายเอง = มั่นใจเต็ม
                    "confirmed",
                    HUMAN_MODEL_VERSION,
                )
            )

    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO evidence_sources (id, user_id, kind, raw_text, ocr_used) "
            "VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
            sources,
        )
        # ลบของเก่าของ human-label ก่อน เพื่อให้รันซ้ำแล้วไม่ทับซ้อน
        cur.execute("DELETE FROM extracted_skills WHERE model_version = %s", (HUMAN_MODEL_VERSION,))
        cur.executemany(
            "INSERT INTO extracted_skills "
            "(user_id, skill_id, source_id, surface_text, span_label, char_start, char_end, "
            " confidence, status, model_version) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            spans,
        )
    conn.commit()
    print(f"  ✓ evidence_sources {len(sources)} แถว · extracted_skills {len(spans)} แถว")


def cmd_corpus(conn, dry: bool, limit: int) -> None:
    if not CORPUS_FILE.exists():
        print(f"ไม่พบ {CORPUS_FILE} — รัน python train/ingest_resumes.py ก่อน")
        return

    rows = read_jsonl(CORPUS_FILE)[:limit]
    total_mb = sum(len(r["text"]) for r in rows) / 1e6
    print(f"corpus: {len(rows):,} ฉบับ (~{total_mb:.1f} MB ข้อความ)")

    if total_mb > 50:
        print(
            "  ⚠ ใหญ่เกินไปสำหรับ Supabase free tier (500 MB)\n"
            "    ชุดนี้เป็น training data ภาษาอังกฤษที่ผลิตภัณฑ์ไม่ได้ query\n"
            "    แนะนำใส่แค่ตัวอย่างไว้ demo: --limit 200"
        )
    if dry:
        return

    uid = ensure_annotator(conn, dry)
    payload = [
        (det_uuid("corpus", r["id"]), uid, "resume", r["text"], bool(r.get("ocr_used")))
        for r in rows
    ]
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO evidence_sources (id, user_id, kind, raw_text, ocr_used) "
            "VALUES (%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
            payload,
        )
    conn.commit()
    print(f"  ✓ ใส่ evidence_sources {len(payload)} แถว")


def cmd_embed(conn, dry: bool) -> None:
    """เติม embedding ให้ skill_taxonomy — ต้องโหลด WangchanBERTa (~420 MB)"""
    with conn.cursor() as cur:
        cur.execute("SELECT id, name_en FROM skill_taxonomy WHERE embedding IS NULL")
        todo = cur.fetchall()

    if not todo:
        print("skill_taxonomy มี embedding ครบแล้ว")
        return
    print(f"ต้องสร้าง embedding {len(todo)} รายการ")
    if dry:
        return

    import torch
    from transformers import AutoModel, AutoTokenizer

    name = os.getenv("SKILL_MODEL_PATH", "airesearch/wangchanberta-base-att-spm-uncased")
    print(f"  โหลด {name} ...")
    tok = AutoTokenizer.from_pretrained(name)
    model = AutoModel.from_pretrained(name).eval()

    updates = []
    with torch.no_grad():
        for i in range(0, len(todo), 32):
            chunk = todo[i : i + 32]
            enc = tok([t for _, t in chunk], padding=True, truncation=True,
                      max_length=64, return_tensors="pt")
            cls = model(**enc).last_hidden_state[:, 0, :]  # CLS token
            for (sid, _), vec in zip(chunk, cls, strict=True):
                updates.append(("[" + ",".join(f"{x:.6f}" for x in vec.tolist()) + "]", sid))

    with conn.cursor() as cur:
        cur.executemany("UPDATE skill_taxonomy SET embedding = %s WHERE id = %s", updates)
    conn.commit()
    print(f"  ✓ อัปเดต embedding {len(updates)} รายการ")


def cmd_verify(conn) -> None:
    """เช็คว่าข้อมูลขึ้นไปจริงและ offset ยังชี้ถูก"""
    with conn.cursor() as cur:
        for table in ["users", "skill_taxonomy", "evidence_sources", "extracted_skills"]:
            cur.execute(f"SELECT count(*) FROM {table}")
            print(f"  {table:<20} {cur.fetchone()[0]:>7,} แถว")

        print("\n  ตรวจว่า offset ชี้ถูกจริง (สุ่ม 5 span):")
        cur.execute(
            "SELECT e.surface_text, e.span_label, "
            "       substring(s.raw_text from e.char_start + 1 for e.char_end - e.char_start) "
            "FROM extracted_skills e JOIN evidence_sources s ON s.id = e.source_id "
            "ORDER BY random() LIMIT 5"
        )
        bad = 0
        for surface, label, sliced in cur.fetchall():
            ok = surface == sliced
            bad += not ok
            print(f"    {'✓' if ok else '✗'} [{label:<5}] {surface!r}" + ("" if ok else f"  แต่ DB ตัดได้ {sliced!r}"))
        print(f"\n  {'✓ offset ถูกต้องทั้งหมด' if not bad else f'✗ เพี้ยน {bad} span'}")


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--what",
        default="all",
        choices=["schema", "security", "seed", "taxonomy", "labeled",
                 "corpus", "embed", "verify", "all"],
    )
    ap.add_argument("--limit", type=int, default=200, help="จำกัดจำนวนฉบับตอนโหลด corpus")
    ap.add_argument("--dry-run", action="store_true", help="ดูว่าจะทำอะไรบ้าง โดยไม่เขียนจริง")
    args = ap.parse_args()

    # dry-run ของขั้นที่อ่านไฟล์อย่างเดียว ไม่ต้องต่อ DB
    # จะได้ลองดูก่อนได้ตั้งแต่ยังไม่มีโปรเจกต์ Supabase
    needs_db = not args.dry_run or args.what in ("embed", "verify")

    conn = None
    if needs_db:
        dsn = get_dsn()
        host = dsn.split("@")[-1].split("/")[0] if "@" in dsn else "?"
        print(f"ต่อไปที่ {host}")
        conn = connect(dsn)
    if args.dry_run:
        print("โหมด dry-run — ไม่เขียนอะไรลงฐานข้อมูล\n")

    try:
        # ลำดับสำคัญ: schema -> seed -> ข้อมูล -> security ปิดท้าย
        # ตั้ง RLS ทีหลังเพราะ FORCE ROW LEVEL SECURITY มีผลกับเจ้าของตารางด้วย
        # ถ้าเปิดก่อนแล้วค่อย insert จะโดนบล็อกเอง
        steps = (
            ["schema", "seed", "taxonomy", "labeled", "security"]
            if args.what == "all"
            else [args.what]
        )
        for step in steps:
            print(f"\n--- {step} ---")
            if step == "schema":
                cmd_schema(conn, args.dry_run)
            elif step in ("security", "seed"):
                run_sql_file(conn, step, args.dry_run)
            elif step == "taxonomy":
                cmd_taxonomy(conn, args.dry_run)
            elif step == "labeled":
                cmd_labeled(conn, args.dry_run)
            elif step == "corpus":
                cmd_corpus(conn, args.dry_run, args.limit)
            elif step == "embed":
                cmd_embed(conn, args.dry_run)
            elif step == "verify":
                cmd_verify(conn)

        if args.what == "all" and not args.dry_run:
            print("\n--- verify ---")
            cmd_verify(conn)
    finally:
        if conn is not None:
            conn.close()

    print("\nเสร็จแล้ว")


if __name__ == "__main__":
    main()
