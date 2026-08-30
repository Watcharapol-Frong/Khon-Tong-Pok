"""
ชั้น D — รับผลเกมจาก frontend แล้วคำนวณ radar

จุดที่ต่อกับของพี่ฟรอง: frontend/src/shared/telemetry.ts มี TODO ค้างไว้

    await sendPayload(payload, 'http://localhost:8000/api/assessment/game');
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ai.scoring.radar import calculate_radar_profile
from app.schemas import CompleteAssessmentPayload, GamePayload, RadarResponse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assessment", tags=["assessment"])

# เก็บในหน่วยความจำไปก่อนจนกว่าจะต่อ Postgres — พอสำหรับ demo
# TODO(สัปดาห์ 1): ย้ายไปตาราง game_sessions / game_metrics
_sessions: dict[str, dict[str, GamePayload]] = {}

REQUIRED_GAMES = ("game1_bart", "game2_wcst", "game3_flanker", "game4_pgg")


@router.post("/game")
async def submit_game(payload: GamePayload) -> dict:
    """
    รับผลเกมทีละเกม (frontend ยิงมาทันทีที่เล่นจบแต่ละเกม)
    เก็บ trials ดิบไว้ด้วย เพื่อ re-score ย้อนหลังได้เมื่อสูตรเปลี่ยน
    """
    if payload.gameId not in REQUIRED_GAMES:
        raise HTTPException(
            status_code=400,
            detail=f"ไม่รู้จัก gameId '{payload.gameId}' — ต้องเป็นหนึ่งใน {REQUIRED_GAMES}",
        )

    _sessions.setdefault(payload.sessionId, {})[payload.gameId] = payload
    done = sorted(_sessions[payload.sessionId])

    log.info("รับ %s ของ session %s (%d/4)", payload.gameId, payload.sessionId, len(done))

    return {
        "sessionId": payload.sessionId,
        "received": payload.gameId,
        "completedGames": done,
        "remaining": [g for g in REQUIRED_GAMES if g not in done],
        "readyForRadar": len(done) == len(REQUIRED_GAMES),
    }


@router.get("/session/{session_id}/radar", response_model=RadarResponse)
async def radar_from_session(session_id: str) -> RadarResponse:
    """คำนวณ radar จากเกมที่เก็บไว้ครบแล้ว"""
    games = _sessions.get(session_id)
    if not games:
        raise HTTPException(status_code=404, detail=f"ไม่พบ session {session_id}")

    missing = [g for g in REQUIRED_GAMES if g not in games]
    if missing:
        raise HTTPException(
            status_code=409,
            detail=f"ยังเล่นไม่ครบ ขาดอีก: {', '.join(missing)}",
        )

    return _build_radar(
        session_id,
        games["game1_bart"].summaryMetrics,
        games["game2_wcst"].summaryMetrics,
        games["game3_flanker"].summaryMetrics,
        games["game4_pgg"].summaryMetrics,
    )


@router.post("/radar", response_model=RadarResponse)
async def radar_from_payload(payload: CompleteAssessmentPayload) -> RadarResponse:
    """คำนวณ radar จาก payload ที่ส่งมาครบในทีเดียว (ใช้ตอน demo / ทดสอบ)"""
    return _build_radar(
        payload.sessionId,
        payload.game1_bart.model_dump(),
        payload.game2_wcst.model_dump(),
        payload.game3_flanker.model_dump(),
        payload.game4_pgg.model_dump(),
    )


def _build_radar(session_id: str, bart, wcst, flanker, pgg) -> RadarResponse:
    try:
        profile = calculate_radar_profile(session_id, bart, wcst, flanker, pgg)
    except KeyError as exc:
        raise HTTPException(
            status_code=422, detail=f"summaryMetrics ขาดฟิลด์ {exc}"
        ) from exc

    # normReferenced จะยังเป็น None จนกว่าจะเก็บกลุ่มอ้างอิงครบ 60 คน
    # แล้วเขียนค่า norm ลงตาราง norm_versions — ดู ai/scoring/radar.py:compute_norms
    return RadarResponse(**profile.to_dict(), normReferenced=None, normVersion=None)
