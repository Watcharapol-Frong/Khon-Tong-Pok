"""
คนตรงปก — AI service

    uvicorn app.main:app --reload --port 8000

จุดที่ frontend ต้องต่อ:
  frontend/src/shared/telemetry.ts  ->  POST /api/assessment/game
  หน้า /decoder ของเว็บ            ->  POST /api/interview/chat
                                       POST /api/resume/upload   (แนบไฟล์)
                                       POST /api/voice/transcribe (สำรองของปุ่มไมค์)

/api/decoder/resume ยังอยู่แต่เป็นของเก่า — ไม่ผ่าน OCR ของ Typhoon
และ **ไม่ลบข้อมูลส่วนตัว** ของใหม่ให้ใช้ /api/resume/upload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import assessment, decoder, interview, resume, voice

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
log = logging.getLogger("khontongpok")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    log.info("LLM provider = %s", settings.llm_provider)
    log.info("Skill model  = %s (%s)", settings.skill_model_path, settings.skill_model_version)
    if settings.skill_model_version == "base-untrained":
        log.warning(
            "โมเดลสกัดทักษะยังไม่ได้ fine-tune — /api/decoder จะคืน spans ว่าง "
            "ระบบยังทำงานได้ปกติ แค่ยังไม่มีผลลัพธ์จริง"
        )
    yield


app = FastAPI(
    title="คนตรงปก AI Service",
    description=(
        "ชั้น A: WangchanBERTa สกัดทักษะ · "
        "ชั้น C: Typhoon คุยสัมภาษณ์ · "
        "ชั้น D: แปลงผลเกมเป็น trait"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(decoder.router)
app.include_router(interview.router)
app.include_router(assessment.router)
app.include_router(resume.router)
app.include_router(voice.router)


@app.get("/")
async def root() -> dict:
    return {
        "service": "khontongpok-ai",
        "docs": "/docs",
        "layers": {
            "A_skill_extraction": "WangchanBERTa (fine-tuned)",
            "C_interview": "Typhoon 2.5",
            "D_game_scoring": "deterministic (no ML by design)",
        },
    }
