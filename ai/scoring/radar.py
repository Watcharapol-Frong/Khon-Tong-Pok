"""
ชั้น D — แปลงผลเกมเป็นคะแนน trait

**พอร์ตตรงจาก frontend/src/analytics/pipeline.ts ของพี่ฟรอง**
ค่าคงที่ทุกตัวต้องตรงกันเป๊ะ ไม่งั้นเลขบนหน้าเว็บกับเลขในฐานข้อมูลจะไม่ตรง
แล้วตอน demo จะโดนจับได้ — tests/test_radar.py มี golden case ล็อกไว้

จงใจไม่ใช้ ML ในชั้นนี้: ต้องอธิบายได้ทุกคะแนนว่ามาจากไหน ไม่งั้นเคลมเรื่อง
"ลดอคติ" ไม่ได้ สูตรที่เขียนบนกระดาษได้คือ feature ไม่ใช่ข้อจำกัด

--------------------------------------------------------------------------
ข้อจำกัดที่ต้องรู้ (และต้องพูดตอน pitch ไม่ใช่ปิดบัง):
pipeline ปัจจุบันใช้ min-max normalize กับค่าคงที่ที่ "ตั้งเอา" ไม่ใช่ z-score
เทียบคนจริง แปลว่าคะแนน 72 ยังตอบไม่ได้ว่า "เก่งกว่ากี่ % ของคน"
ฟังก์ชัน to_percentile() ข้างล่างจะใช้ได้ก็ต่อเมื่อเก็บกลุ่มอ้างอิงครบ 60 คน
--------------------------------------------------------------------------
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


# ===========================================================================
# helper — ต้องเหมือน pipeline.ts บรรทัดต่อบรรทัด
# ===========================================================================
def normalize_direct(value: float, lo: float, hi: float) -> float:
    if value <= lo:
        return 0.0
    if value >= hi:
        return 100.0
    return ((value - lo) / (hi - lo)) * 100.0


def normalize_inverted(value: float, best: float, worst: float) -> float:
    if value <= best:
        return 100.0
    if value >= worst:
        return 0.0
    return ((worst - value) / (worst - best)) * 100.0


def normalize_target(value: float, lo: float, target: float, hi: float) -> float:
    if value <= lo or value >= hi:
        return 0.0
    if value == target:
        return 100.0
    if value < target:
        return ((value - lo) / (target - lo)) * 100.0
    return ((hi - value) / (hi - target)) * 100.0


def clamp(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


# ===========================================================================
AXES = (
    "riskTolerance",
    "learningAgility",
    "criticalThinking",
    "decisionMakingUnderPressure",
    "collaborationMindset",
    "resilienceAndAdaptability",
)


@dataclass
class RadarProfile:
    session_id: str
    generated_at: str
    axes: dict[str, float]
    overall_index: float
    # เก็บคะแนนย่อยไว้ด้วย — ใช้ตอบคำถาม "ทำไมได้คะแนนนี้"
    sub_scores: dict[str, float]

    def to_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "generatedAt": self.generated_at,
            "axes": self.axes,
            "overallIndex": self.overall_index,
            "subScores": self.sub_scores,
        }


def calculate_radar_profile(
    session_id: str,
    bart: dict,
    wcst: dict,
    flanker: dict,
    pgg: dict,
) -> RadarProfile:
    """รับ summaryMetrics ของทั้ง 4 เกม (ตรงตาม type ของ frontend)"""

    # ---- Game 1: BART ----
    bart_risk_acumen = normalize_target(bart["adjustedAveragePumps"], 4, 15, 26)
    bart_explosion_tolerance = normalize_inverted(bart["explodedTrialsCount"], 2, 10)
    bart_impulse_control = normalize_inverted(
        abs(bart["postExplosionAdaptationDelta"]), 1, 8
    )

    # ---- Game 2: WCST ----
    wcst_categories = normalize_direct(wcst["categoriesCompleted"], 0, 5)
    wcst_perseverative = normalize_inverted(wcst["perseverativeErrors"], 0, 12)
    wcst_first_rule_speed = normalize_inverted(wcst["trialsToFirstCategory"], 6, 20)
    wcst_rule_maintenance = normalize_inverted(wcst["failureToMaintainSet"], 0, 3)

    # ---- Game 3: Flanker ----
    flanker_interference = normalize_inverted(flanker["flankerEffectMs"], 20, 180)
    flanker_incongruent_acc = normalize_direct(flanker["incongruentAccuracy"], 0.70, 1.0)
    flanker_impulse = normalize_inverted(flanker["impulsiveErrorCount"], 0, 4)
    flanker_pes = normalize_target(flanker["postErrorSlowingMs"], -100, 80, 250)

    # ---- Game 4: PGG ----
    pgg_trust = normalize_direct(pgg["initialContribution"], 2, 10)
    pgg_prosocial = normalize_direct(pgg["averageContribution"], 2, 9)
    pgg_boundaries = normalize_target(pgg["freeRiderSensitivity"], 0.0, 0.5, 2.5)
    pgg_decay_stability = normalize_target(pgg["cooperationDecaySlope"], -0.80, -0.15, 0.40)

    # ---- สังเคราะห์เป็น 6 แกน ----
    axes = {
        "riskTolerance": clamp(
            bart_risk_acumen * 0.50 + pgg_trust * 0.30 + bart_explosion_tolerance * 0.20
        ),
        "learningAgility": clamp(
            wcst_perseverative * 0.40
            + wcst_categories * 0.30
            + wcst_first_rule_speed * 0.20
            + wcst_rule_maintenance * 0.10
        ),
        "criticalThinking": clamp(
            flanker_interference * 0.50
            + flanker_incongruent_acc * 0.35
            + wcst_rule_maintenance * 0.15
        ),
        "decisionMakingUnderPressure": clamp(
            flanker_incongruent_acc * 0.40
            + flanker_impulse * 0.30
            + bart_impulse_control * 0.30
        ),
        "collaborationMindset": clamp(
            pgg_prosocial * 0.50 + pgg_trust * 0.30 + pgg_decay_stability * 0.20
        ),
        "resilienceAndAdaptability": clamp(
            pgg_boundaries * 0.40 + pgg_decay_stability * 0.30 + flanker_pes * 0.30
        ),
    }

    overall = clamp(sum(axes.values()) / len(axes))

    return RadarProfile(
        session_id=session_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        axes=axes,
        overall_index=overall,
        sub_scores={
            "bartRiskAcumen": clamp(bart_risk_acumen),
            "bartExplosionTolerance": clamp(bart_explosion_tolerance),
            "bartImpulseControl": clamp(bart_impulse_control),
            "wcstCategories": clamp(wcst_categories),
            "wcstPerseverative": clamp(wcst_perseverative),
            "wcstFirstRuleSpeed": clamp(wcst_first_rule_speed),
            "wcstRuleMaintenance": clamp(wcst_rule_maintenance),
            "flankerInterference": clamp(flanker_interference),
            "flankerIncongruentAcc": clamp(flanker_incongruent_acc),
            "flankerImpulse": clamp(flanker_impulse),
            "flankerPes": clamp(flanker_pes),
            "pggTrust": clamp(pgg_trust),
            "pggProsocial": clamp(pgg_prosocial),
            "pggBoundaries": clamp(pgg_boundaries),
            "pggDecayStability": clamp(pgg_decay_stability),
        },
    )


# ===========================================================================
# ชั้น norm — ใช้ได้เมื่อเก็บกลุ่มอ้างอิงครบแล้วเท่านั้น
# ===========================================================================
def compute_norms(profiles: list[RadarProfile]) -> dict[str, dict[str, float]]:
    """
    คำนวณ mean/std ของแต่ละแกนจากกลุ่มอ้างอิง
    เรียกครั้งเดียวหลังเก็บข้อมูลครบ แล้วเก็บลงตาราง norm_versions
    """
    import statistics

    if len(profiles) < 30:
        raise ValueError(
            f"มีแค่ {len(profiles)} คน — ต่ำกว่า 30 คน std จะไม่เสถียร "
            "อย่าเพิ่งเอาไปคิด percentile"
        )

    norms: dict[str, dict[str, float]] = {}
    for axis in AXES:
        values = [p.axes[axis] for p in profiles]
        norms[axis] = {
            "mean": statistics.fmean(values),
            "std": statistics.stdev(values),
            "n": len(values),
        }
    return norms


def to_percentile(
    profile: RadarProfile, norms: dict[str, dict[str, float]]
) -> dict[str, dict[str, float]]:
    """
    แปลงคะแนนดิบเป็น z + percentile เทียบกลุ่มอ้างอิง
    นี่คือสิ่งที่ทำให้ตอบกรรมการได้ว่า "72 นี่เทียบกับใคร"
    """
    from math import erf, sqrt

    out: dict[str, dict[str, float]] = {}
    for axis in AXES:
        stats = norms.get(axis)
        if not stats or stats["std"] == 0:
            continue
        z = (profile.axes[axis] - stats["mean"]) / stats["std"]
        pct = 0.5 * (1 + erf(z / sqrt(2))) * 100
        out[axis] = {
            "raw": profile.axes[axis],
            "z": round(z, 3),
            "percentile": round(pct, 1),
        }
    return out
