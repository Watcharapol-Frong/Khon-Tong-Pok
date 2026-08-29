"""
อัปโหลดเรซูเม่ — เส้นทางเดียวตั้งแต่ไฟล์จนถึงบทสนทนา

    ไฟล์ -> อ่านข้อความ -> ลบข้อมูลส่วนตัว -> สกัดทักษะ -> บันทึก -> ส่งเข้าแชท

ลำดับนี้ห้ามสลับ
---------------
redact ต้องมาก่อนสกัดทักษะเสมอ เพราะ char_start/char_end ที่สกัดได้
ต้องชี้กลับไปที่ข้อความ "หลัง" redact ซึ่งเป็นตัวเดียวกับที่เก็บลง DB
ถ้าสกัดจากข้อความเต็มก่อนแล้วค่อยลบ พิกัดจะเลื่อนทั้งหมดโดยไม่มีอะไรฟ้อง
ปุ่ม "ทักษะนี้มาจากประโยคไหน" จะไฮไลต์ผิดตำแหน่งแบบเงียบ ๆ

และ redact ต้องมาก่อนเรียก LLM ด้วย
-----------------------------------
ถ้าส่งข้อความดิบไปให้โมเดลสรุป ชื่อกับเบอร์โทรจะไปโผล่ใน context ของ provider
ต่อให้เราไม่ได้เก็บเองก็ตาม — กติกาข้อ 1 ของทีมพังตรงนั้น
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from ai.llm.base import Message
from ai.llm.prompts import RESUME_DIGEST, resume_context_block
from ai.ocr.reader import IMAGE_EXT, read_document
from ai.ocr.typhoon_ocr import TyphoonOCR
from ai.privacy.redact import redact
from app.config import get_settings
from app.routers.decoder import get_extractor
from app.routers.interview import get_provider
from app.schemas import (
    RedactionReport,
    ResumeIngestResponse,
    SkillSpanOut,
)
from db import store

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resume", tags=["resume"])

ALLOWED_EXT = (".pdf", ".docx", *IMAGE_EXT)

# น้อยกว่านี้แปลว่าอ่านไฟล์ไม่ออกจริง ๆ ไม่ใช่ "เรซูเม่สั้น"
MIN_USABLE_CHARS = 40


def _typhoon_ocr() -> TyphoonOCR | None:
    s = get_settings()
    if not s.ocr_enabled:
        return None
    return TyphoonOCR(
        api_key=s.typhoon_api_key,
        base_url=s.typhoon_ocr_base_url,
        model=s.typhoon_ocr_model,
        max_pages=s.typhoon_ocr_max_pages,
    )


def _pipeline(data: bytes, filename: str, external_user_id: str | None) -> dict:
    """
    ส่วนที่บล็อก (เรนเดอร์ภาพ · เรียก OCR · รันโมเดล · เขียน DB)
    รวมไว้ที่เดียวเพื่อโยนเข้า threadpool ทีเดียว ไม่ให้ค้าง event loop
    """
    settings = get_settings()

    doc = read_document(
        data,
        filename,
        typhoon=_typhoon_ocr(),
        tesseract_cmd=settings.tesseract_cmd,
    )

    if len(doc.text.strip()) < MIN_USABLE_CHARS:
        return {"doc": doc, "failed": True}

    # ---- ลบข้อมูลส่วนตัวก่อนแตะอย่างอื่น ----
    red = redact(doc.text)

    # ---- สกัดทักษะจากข้อความที่ลบแล้ว พิกัดจึงตรงกับที่เก็บลง DB ----
    result = get_extractor().extract(red.text)
    spans = [s.to_dict() for s in result.spans]

    source_id = store.save_resume(
        external_user_id=external_user_id,
        filename=filename,
        redacted_text=red.text,
        ocr_used=doc.ocr_used,
        extract_method=doc.method,
        n_pages=doc.pages,
        redaction_report=red.report,
        spans=spans,
        model_version=result.model_version,
    )

    return {
        "doc": doc,
        "failed": False,
        "red": red,
        "result": result,
        "spans": spans,
        "source_id": source_id,
    }


async def _digest(redacted_text: str) -> tuple[str, str]:
    """
    ให้ Typhoon อ่านเรซูเม่ที่ลบข้อมูลแล้ว คืน (สรุป, ประโยคเปิดบทสนทนา)

    ทำไมต้องสรุป: ถ้าแนบข้อความเต็มไปทุกเทิร์นของแชท token จะบานและช้าขึ้นเรื่อย ๆ
    สรุปครั้งเดียวแล้วพกสรุปไปแทน ได้บริบทเท่าเดิมในราคาที่คงที่

    ล้มเหลวได้ ไม่ใช่เรื่องใหญ่ — แค่ไม่มีประโยคเปิดที่อ้างถึงเรซูเม่
    การอัปโหลดยังถือว่าสำเร็จ
    """
    try:
        provider = get_provider()
        raw = await provider.chat(
            [Message(role="user", content=RESUME_DIGEST.format(resume=redacted_text[:6000]))],
            temperature=0.3,
            max_tokens=600,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("สรุปเรซูเม่ไม่สำเร็จ (%s) — ข้ามไป", type(exc).__name__)
        return "", ""

    # รูปแบบที่ขอไว้คือ  <สรุป>\n---\n<ประโยคเปิด>
    if "---" in raw:
        summary, _, opening = raw.partition("---")
        return summary.strip(), opening.strip()
    return raw.strip(), ""


@router.post("/upload", response_model=ResumeIngestResponse)
async def upload_resume(
    file: UploadFile = File(...),
    userId: str | None = Form(None),
    summarize: bool = Form(True),
) -> ResumeIngestResponse:
    started = time.perf_counter()
    settings = get_settings()

    name = file.filename or "resume.pdf"
    if not name.lower().endswith(ALLOWED_EXT):
        raise HTTPException(
            status_code=400,
            detail="รองรับ PDF, DOCX และรูปภาพ (PNG/JPG) ครับ",
        )

    data = await file.read()
    limit = settings.max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(
            status_code=413, detail=f"ไฟล์ใหญ่เกิน {settings.max_upload_mb}MB ครับ"
        )
    if not data:
        raise HTTPException(status_code=400, detail="ไฟล์ว่างเปล่าครับ")

    try:
        out = await run_in_threadpool(_pipeline, data, name, userId)
    except Exception as exc:  # noqa: BLE001
        log.exception("อ่านไฟล์ไม่สำเร็จ")
        raise HTTPException(
            status_code=422,
            detail=f"เปิดไฟล์นี้ไม่ได้ครับ ({type(exc).__name__}) ลองไฟล์อื่นดูนะครับ",
        ) from exc

    doc = out["doc"]
    if out["failed"]:
        raise HTTPException(
            status_code=422,
            detail=(
                "อ่านข้อความจากไฟล์นี้ไม่ได้เลยครับ "
                + (doc.note or "")
                + " ลองแนบไฟล์ที่ชัดกว่านี้ หรือพิมพ์เล่าประสบการณ์ในแชทแทนได้ครับ"
            ),
        )

    red, result = out["red"], out["result"]

    summary, opening = ("", "")
    if summarize:
        summary, opening = await _digest(red.text)

    log.info(
        "อัปโหลด %s | %s | %d ตัวอักษร | ลบ %d จุด | %d ทักษะ | %.1f วิ",
        name, doc.method, len(red.text), red.report["total"],
        len(out["spans"]), time.perf_counter() - started,
    )

    return ResumeIngestResponse(
        filename=name,
        sourceId=out["source_id"],
        saved=out["source_id"] is not None,
        method=doc.method,
        ocrUsed=doc.ocr_used,
        pages=doc.pages,
        charCount=len(red.text),
        redactedText=red.text,
        redaction=RedactionReport(**red.report),
        redactionSummary=red.summary_th(),
        spans=[SkillSpanOut(**s) for s in out["spans"]],
        skills=sorted({s["surface_text"] for s in out["spans"]}),
        modelVersion=result.model_version,
        trained=result.trained,
        summary=summary,
        openingMessage=opening,
        note=doc.note or result.note,
    )


@router.post("/redact")
async def redact_text(text: str = Form(...)) -> dict:
    """
    ลบข้อมูลส่วนตัวจากข้อความเปล่า ๆ

    มีไว้ให้ฝั่งเว็บเรียกในกรณีที่มันแกะ PDF เองในเบราว์เซอร์ (เส้นทางเดิม)
    จะได้ไม่มีทางที่ข้อความดิบจะถูกเก็บลง profile อีก
    และมีไว้เดโมให้กรรมการเห็นสด ๆ ว่าอะไรถูกลบบ้าง
    """
    red = redact(text)
    return {
        "redactedText": red.text,
        "redaction": red.report,
        "redactionSummary": red.summary_th(),
    }


@router.get("/history/{external_user_id}")
async def history(external_user_id: str, limit: int = 5) -> dict:
    rows = await run_in_threadpool(store.recent_uploads, external_user_id, limit)
    return {"uploads": rows}


@router.get("/capabilities")
async def capabilities() -> dict:
    """เรียกก่อนขึ้นเวทีเพื่อรู้ว่าตอนนี้ระบบอ่านไฟล์ด้วยอะไรได้บ้าง"""
    s = get_settings()
    ocr = _typhoon_ocr()
    return {
        "typhoonOcr": bool(ocr and ocr.available),
        "typhoonOcrModel": s.typhoon_ocr_model if ocr and ocr.available else None,
        "maxPagesPerFile": s.typhoon_ocr_max_pages,
        "tesseract": bool(s.tesseract_cmd),
        "maxUploadMb": s.max_upload_mb,
        "acceptedTypes": list(ALLOWED_EXT),
        "persistence": bool(s.database_url),
    }
