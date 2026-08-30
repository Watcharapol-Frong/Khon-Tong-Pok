"""
สัญญา JSON ระหว่าง frontend กับ backend

**ทุกชื่อฟิลด์ในกลุ่มเกมต้องตรงกับ frontend/src/games/*/types.ts เป๊ะ ๆ**
เป็น camelCase เพราะฝั่ง TypeScript ใช้ camelCase — อย่าแปลงเป็น snake_case
ไม่งั้นพี่ฟรองต้องเขียน adapter เพิ่มโดยไม่จำเป็น
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ===========================================================================
# เกม — mirror ตรงจาก types.ts
# ===========================================================================
class BartSummaryMetrics(BaseModel):
    totalTrials: int
    explodedTrialsCount: int
    unexplodedTrialsCount: int
    adjustedAveragePumps: float
    overallAveragePumps: float
    totalPointsEarned: float
    averagePumpLatencyMs: float
    postExplosionAdaptationDelta: float


class WcstSummaryMetrics(BaseModel):
    totalTrials: int
    categoriesCompleted: int
    totalCorrect: int
    totalErrors: int
    perseverativeErrors: int
    nonPerseverativeErrors: int
    perseverativeErrorRate: float
    trialsToFirstCategory: int
    failureToMaintainSet: int
    averageReactionTimeMs: float


class FlankerSummaryMetrics(BaseModel):
    totalTrials: int
    congruentTrials: int
    incongruentTrials: int
    totalCorrect: int
    totalErrors: int
    timeouts: int
    timeoutRate: float
    meanCongruentRtMs: float
    meanIncongruentRtMs: float
    congruentAccuracy: float
    incongruentAccuracy: float
    flankerEffectMs: float
    postErrorSlowingMs: float
    impulsiveErrorCount: int


class PggSummaryMetrics(BaseModel):
    totalRounds: int
    initialContribution: float
    averageContribution: float
    freeRiderSensitivity: float
    cooperationDecaySlope: float
    meanDecisionLatencyMs: float
    finalCumulativePayoff: float


class GamePayload(BaseModel):
    """payload ของเกมเดี่ยว — ตรงกับที่ sendPayload() ส่งมา"""

    sessionId: str
    gameId: str
    startedAt: str
    completedAt: str
    summaryMetrics: dict[str, Any]
    # trials / rounds เก็บดิบไว้เพื่อ re-score ย้อนหลังได้เมื่อสูตรเปลี่ยน
    trials: list[dict[str, Any]] | None = None
    rounds: list[dict[str, Any]] | None = None


class CompleteAssessmentPayload(BaseModel):
    """ครบทั้ง 4 เกม -> คำนวณ radar ได้"""

    sessionId: str
    game1_bart: BartSummaryMetrics
    game2_wcst: WcstSummaryMetrics
    game3_flanker: FlankerSummaryMetrics
    game4_pgg: PggSummaryMetrics


class RadarResponse(BaseModel):
    sessionId: str
    generatedAt: str
    axes: dict[str, float]
    overallIndex: float
    subScores: dict[str, float]
    # จะมีค่าก็ต่อเมื่อมี norm ที่ active อยู่แล้วเท่านั้น
    normReferenced: dict[str, dict[str, float]] | None = None
    normVersion: str | None = None


# ===========================================================================
# น้องตรงปก — แชทสัมภาษณ์ (ชั้น C)
# ===========================================================================
class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    sessionId: str
    messages: list[ChatMessage] = Field(
        description="ประวัติบทสนทนาทั้งหมด ไม่ต้องใส่ system prompt มา backend ใส่ให้เอง"
    )
    resumeContext: str | None = Field(
        default=None,
        description=(
            "สรุปเรซูเม่ที่ผ่านการลบข้อมูลส่วนตัวแล้ว (ได้จาก /api/resume/upload) "
            "ส่งมาด้วยแล้วน้องตรงปกจะถามต่อยอดจากสิ่งที่เขียนไว้จริง "
            "ห้ามส่งข้อความดิบที่ยังไม่ผ่าน redact เข้ามา"
        ),
    )


class ChatResponse(BaseModel):
    sessionId: str
    reply: str
    model: str
    provider: str


# ===========================================================================
# Decoder — สกัดทักษะ (ชั้น A)
# ===========================================================================
class SkillSpanOut(BaseModel):
    surface_text: str
    label: Literal["SKILL", "KNOW"]
    char_start: int
    char_end: int
    confidence: float


class ExtractRequest(BaseModel):
    userId: str | None = None
    text: str


class ExtractResponse(BaseModel):
    sourceText: str
    spans: list[SkillSpanOut]
    modelVersion: str
    trained: bool
    note: str = ""


class ResumeUploadResponse(BaseModel):
    filename: str
    charCount: int
    ocrUsed: bool
    spans: list[SkillSpanOut]
    modelVersion: str
    trained: bool
    note: str = ""


# ===========================================================================
# อัปโหลดเรซูเม่ฉบับเต็ม (OCR -> ลบข้อมูลส่วนตัว -> สกัดทักษะ -> บันทึก)
# ===========================================================================
class RedactionReport(BaseModel):
    total: int = 0
    pii: int = 0
    bias: int = 0
    by_kind: dict[str, int] = Field(default_factory=dict)


class ResumeIngestResponse(BaseModel):
    filename: str
    # ว่างได้ถ้าต่อ Supabase ไม่ติด — ผู้ใช้ยังได้ผลลัพธ์ครบ แค่ไม่มีประวัติ
    sourceId: str | None = None
    saved: bool = False

    # อ่านมาได้ยังไง
    method: Literal["text_layer", "typhoon_ocr", "tesseract", "docx", "none"]
    ocrUsed: bool
    pages: int
    charCount: int

    # ผลการลบข้อมูลส่วนตัว
    redactedText: str = Field(
        description="ข้อความที่ลบข้อมูลส่วนตัวแล้ว — พิกัดใน spans อ้างอิงข้อความนี้"
    )
    redaction: RedactionReport
    redactionSummary: str

    # ทักษะที่สกัดได้
    spans: list[SkillSpanOut]
    skills: list[str]
    modelVersion: str
    trained: bool

    # ต่อเข้าแชท
    summary: str = ""
    openingMessage: str = ""

    note: str = ""


class VoiceTranscribeResponse(BaseModel):
    text: str
    model: str
    durationSec: float | None = None


# ===========================================================================
class HealthResponse(BaseModel):
    status: str
    llmProvider: str
    llmModel: str
    llmReachable: bool
    skillModel: str
    skillModelTrained: bool
