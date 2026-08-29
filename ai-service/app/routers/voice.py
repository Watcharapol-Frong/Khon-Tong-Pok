"""
คุยกับน้องตรงปกด้วยเสียง

ทางหลักคือเบราว์เซอร์ ไม่ใช่ที่นี่
------------------------------------
หน้าเว็บใช้ Web Speech API (`webkitSpeechRecognition`) ซึ่งรองรับ th-TH
ทำงานทันทีบน Chrome/Edge ไม่ต้องลงอะไร ไม่เสียโควตา และไม่ต้องอัปโหลดไฟล์เสียง
สำหรับงาน hackathon นี่คือทางที่ได้ผลจริงและเร็วที่สุด

ไฟล์นี้มีไว้รับกรณีที่เหลือ
--------------------------
Firefox กับ Safari บนเดสก์ท็อปยังไม่รองรับ Web Speech API
ถ้ากรรมการเปิดด้วยเบราว์เซอร์พวกนั้นแล้วปุ่มไมค์กดไม่ได้เลยจะดูแย่
endpoint นี้เลยรับไฟล์เสียงมาถอดให้แทน

รองรับ 2 แบบ ตั้งค่าที่ ASR_PROVIDER ใน .env
  local_whisper       ใช้ faster-whisper ในเครื่อง — ฟรี ไม่มีโควตา แต่ต้อง pip install
  openai_compatible   ยิงไปที่ /audio/transcriptions ของ endpoint ที่ตั้งไว้

ถ้าไม่ได้ตั้งค่าอะไรเลย endpoint จะตอบ 503 พร้อมบอกวิธีเปิดใช้
จงใจไม่ให้มันเงียบ ๆ แล้วคืนข้อความว่าง เพราะแบบนั้น debug ยากกว่ามาก
"""

from __future__ import annotations

import io
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.config import get_settings
from app.schemas import VoiceTranscribeResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_AUDIO_BYTES = 8 * 1024 * 1024   # ~8 นาทีของ webm/opus ก็ยังไม่ถึง
_whisper = None


def _local_whisper():
    """โหลดโมเดลครั้งเดียวแล้วใช้ซ้ำ — โหลดใหม่ทุก request จะช้าจนใช้ไม่ได้"""
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel

        s = get_settings()
        log.info("กำลังโหลด faster-whisper (%s) ...", s.asr_model)
        # int8 บน CPU เร็วพอสำหรับประโยคสั้น ๆ และไม่แย่ VRAM กับตัวเทรน
        _whisper = WhisperModel(s.asr_model, device="auto", compute_type="int8")
    return _whisper


def _transcribe_local(data: bytes) -> tuple[str, float | None]:
    model = _local_whisper()
    segments, info = model.transcribe(
        io.BytesIO(data),
        language="th",
        vad_filter=True,          # ตัดช่วงเงียบออก ไม่งั้นโมเดลชอบแต่งคำมาเติม
        beam_size=5,
    )
    return " ".join(seg.text.strip() for seg in segments).strip(), info.duration


def _transcribe_remote(data: bytes, filename: str) -> tuple[str, float | None]:
    import httpx

    s = get_settings()
    resp = httpx.post(
        f"{s.asr_base_url.rstrip('/')}/audio/transcriptions",
        headers={"Authorization": f"Bearer {s.asr_api_key}"},
        files={"file": (filename or "audio.webm", data)},
        data={"model": s.asr_model, "language": "th"},
        timeout=120.0,
    )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"บริการถอดเสียงตอบ {resp.status_code}: {resp.text[:200]}",
        )
    body = resp.json()
    return (body.get("text") or "").strip(), body.get("duration")


@router.post("/transcribe", response_model=VoiceTranscribeResponse)
async def transcribe(file: UploadFile = File(...)) -> VoiceTranscribeResponse:
    s = get_settings()

    if s.asr_provider == "browser":
        raise HTTPException(
            status_code=503,
            detail=(
                "เซิร์ฟเวอร์ยังไม่ได้เปิดบริการถอดเสียง — หน้าเว็บใช้ Web Speech API "
                "ของเบราว์เซอร์อยู่ ถ้าต้องการให้ Firefox/Safari ใช้ได้ด้วย "
                "ให้ตั้ง ASR_PROVIDER=local_whisper แล้ว pip install faster-whisper"
            ),
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลเสียงส่งมาครับ")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="ไฟล์เสียงยาวเกินไปครับ")

    try:
        if s.asr_provider == "local_whisper":
            text, duration = await run_in_threadpool(_transcribe_local, data)
        else:
            text, duration = await run_in_threadpool(
                _transcribe_remote, data, file.filename or "audio.webm"
            )
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="ยังไม่ได้ติดตั้ง faster-whisper — รัน: pip install faster-whisper",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        log.exception("ถอดเสียงไม่สำเร็จ")
        raise HTTPException(
            status_code=502, detail=f"ถอดเสียงไม่สำเร็จครับ ({type(exc).__name__})"
        ) from exc

    return VoiceTranscribeResponse(text=text, model=s.asr_model, durationSec=duration)


@router.get("/capabilities")
async def capabilities() -> dict:
    """
    หน้าเว็บเรียกตอนโหลด เพื่อรู้ว่ามีทางสำรองไหมถ้าเบราว์เซอร์ไม่รองรับ

    ถ้าไม่มีทั้งคู่ ให้ซ่อนปุ่มไมค์ไปเลย ดีกว่าโชว์ปุ่มที่กดแล้วขึ้น error
    """
    s = get_settings()
    return {
        "serverTranscription": s.asr_provider != "browser",
        "provider": s.asr_provider,
        "model": s.asr_model if s.asr_provider != "browser" else None,
        "browserApiLanguage": "th-TH",
    }
