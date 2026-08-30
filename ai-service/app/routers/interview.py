"""ชั้น C — น้องตรงปกคุยสัมภาษณ์ด้วย Typhoon"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ai.llm.base import Message, build_provider
from ai.llm.prompts import (
    INTERVIEWER_SYSTEM,
    OPENING_MESSAGE,
    TRANSCRIPT_CLEANUP,
    resume_context_block,
)
from app.config import get_settings
from app.schemas import ChatRequest, ChatResponse, HealthResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/interview", tags=["interview"])

_provider = None


def get_provider():
    """สร้าง provider ครั้งเดียวแล้วใช้ซ้ำ — ไม่ต้อง handshake ใหม่ทุก request"""
    global _provider
    if _provider is None:
        _provider = build_provider(get_settings())
    return _provider


@router.get("/opening")
async def opening() -> dict:
    """ข้อความเปิดของน้องตรงปก — frontend เรียกตอนเปิดหน้า /decoder"""
    return {"reply": OPENING_MESSAGE}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    provider = get_provider()

    # system prompt ใส่จากฝั่ง server เสมอ ห้ามให้ client ส่งมา
    # ไม่งั้นใครก็ override กติกา "ห้ามถาม GPA" ได้จาก devtools
    messages = [Message(role="system", content=INTERVIEWER_SYSTEM)]

    # เรซูเม่ที่แนบมาเข้าเป็น system message "แยกก้อน" ต่อจากกติกา
    # วางหลังกติกาเสมอ เพื่อให้กติกาชนะถ้าเนื้อในไฟล์ขัดกัน
    if req.resumeContext and req.resumeContext.strip():
        messages.append(
            Message(role="system", content=resume_context_block(req.resumeContext))
        )

    messages += [
        Message(role=m.role, content=m.content)
        for m in req.messages
        if m.role != "system"
    ]

    try:
        reply = await provider.chat(messages, temperature=0.7, max_tokens=500)
    except Exception as exc:  # noqa: BLE001
        log.exception("เรียกโมเดลไม่สำเร็จ")
        raise HTTPException(
            status_code=503,
            detail=(
                "ตอนนี้น้องตรงปกตอบไม่ได้ชั่วคราวครับ ลองใหม่อีกครั้ง "
                f"({type(exc).__name__})"
            ),
        ) from exc

    return ChatResponse(
        sessionId=req.sessionId,
        reply=reply,
        model=provider.model,
        provider=provider.name,
    )


@router.post("/cleanup")
async def cleanup_transcript(req: ChatRequest) -> dict:
    """
    ให้ Typhoon เรียบเรียง transcript เป็นย่อหน้าสะอาดก่อนส่งต่อให้ชั้น A

    ขั้นนี้ไม่ใช่ของฟุ่มเฟือย: transcript ดิบเต็มไปด้วย "ครับ" "อืม" "เดี๋ยวนะ"
    ซึ่งทำให้ token classification เพี้ยน การเรียบเรียงก่อนช่วยดัน F1 ขึ้นได้
    โดยไม่ต้องเทรนโมเดลเพิ่ม
    """
    provider = get_provider()

    transcript = "\n".join(
        f"{'ผู้ใช้' if m.role == 'user' else 'น้องตรงปก'}: {m.content}"
        for m in req.messages
        if m.role in ("user", "assistant")
    )

    try:
        cleaned = await provider.chat(
            [Message(role="user", content=TRANSCRIPT_CLEANUP.format(transcript=transcript))],
            temperature=0.2,
            max_tokens=900,
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("cleanup ล้มเหลว")
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"sessionId": req.sessionId, "cleanedText": cleaned}


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """
    เรียกอันนี้ 10 นาทีก่อนขึ้นเวที
    ถ้า llmReachable=false ให้สลับ LLM_PROVIDER=ollama ทันที
    """
    from ai.skill.extractor import SkillExtractor

    settings = get_settings()
    provider = get_provider()
    reachable = await provider.healthy()

    extractor = SkillExtractor(
        settings.skill_model_path, settings.skill_model_version
    )
    try:
        extractor.load()
        trained = extractor._trained
    except Exception:  # noqa: BLE001
        trained = False

    return HealthResponse(
        status="ok" if reachable else "degraded",
        llmProvider=provider.name,
        llmModel=provider.model,
        llmReachable=reachable,
        skillModel=settings.skill_model_path,
        skillModelTrained=trained,
    )
