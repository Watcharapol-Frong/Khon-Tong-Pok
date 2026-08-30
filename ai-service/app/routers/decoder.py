"""ชั้น A — สกัดทักษะจากเรซูเม่และบทสนทนา"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from ai.skill.extractor import SkillExtractor
from ai.skill.pdf import extract_text
from app.config import get_settings
from app.schemas import (
    ExtractRequest,
    ExtractResponse,
    ResumeUploadResponse,
    SkillSpanOut,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/decoder", tags=["decoder"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # ตรงกับที่หน้าเว็บเขียนไว้ว่า "ไม่เกิน 10MB"

_extractor: SkillExtractor | None = None


def get_extractor() -> SkillExtractor:
    global _extractor
    if _extractor is None:
        s = get_settings()
        _extractor = SkillExtractor(
            model_path=s.skill_model_path,
            model_version=s.skill_model_version,
            threshold=s.skill_confidence_threshold,
        )
    return _extractor


@router.post("/extract", response_model=ExtractResponse)
async def extract_from_text(req: ExtractRequest) -> ExtractResponse:
    """สกัดทักษะจากข้อความเปล่า — ใช้กับ transcript ที่ผ่าน /interview/cleanup มาแล้ว"""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="ข้อความว่างเปล่า")

    result = get_extractor().extract(req.text)
    return ExtractResponse(
        sourceText=req.text,
        spans=[SkillSpanOut(**s.to_dict()) for s in result.spans],
        modelVersion=result.model_version,
        trained=result.trained,
        note=result.note,
    )


@router.post("/resume", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)) -> ResumeUploadResponse:
    """อัปโหลดเรซูเม่ PDF -> ข้อความ -> ทักษะพร้อมพิกัดในต้นฉบับ"""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ PDF ครับ")

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์ใหญ่เกิน 10MB ครับ")

    settings = get_settings()
    try:
        text, ocr_used = extract_text(data, tesseract_cmd=settings.tesseract_cmd)
    except Exception as exc:  # noqa: BLE001
        log.exception("อ่าน PDF ไม่สำเร็จ")
        raise HTTPException(
            status_code=422, detail=f"อ่านไฟล์ PDF ไม่ได้ครับ ({type(exc).__name__})"
        ) from exc

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="อ่านข้อความจากไฟล์นี้ไม่ได้เลยครับ ลองอัปโหลดไฟล์ที่ไม่ใช่ภาพสแกน "
            "หรือพิมพ์เล่าประสบการณ์ในแชทแทนได้",
        )

    result = get_extractor().extract(text)
    return ResumeUploadResponse(
        filename=file.filename or "resume.pdf",
        charCount=len(text),
        ocrUsed=ocr_used,
        spans=[SkillSpanOut(**s.to_dict()) for s in result.spans],
        modelVersion=result.model_version,
        trained=result.trained,
        note=result.note,
    )
