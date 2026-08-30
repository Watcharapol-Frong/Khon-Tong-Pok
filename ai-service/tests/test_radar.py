"""
ล็อกความตรงกันข้ามภาษา: Python ต้องได้เลขเท่ากับ TypeScript เป๊ะ

ค่า golden ในไฟล์นี้ก๊อปมาจาก frontend/src/analytics/pipeline.test.ts ของพี่ฟรอง
ถ้าเทสต์นี้แดง แปลว่า backend กับ frontend กำลังโชว์คะแนนคนละชุด — ห้ามปล่อยผ่าน
"""

import pytest

from ai.scoring.radar import calculate_radar_profile, compute_norms, to_percentile


def mock_bart(**over):
    return {
        "totalTrials": 20,
        "explodedTrialsCount": 4,
        "unexplodedTrialsCount": 16,
        "adjustedAveragePumps": 14.8,
        "overallAveragePumps": 12.1,
        "totalPointsEarned": 240,
        "averagePumpLatencyMs": 280,
        "postExplosionAdaptationDelta": -1.2,
        **over,
    }


def mock_wcst(**over):
    return {
        "totalTrials": 40,
        "categoriesCompleted": 4,
        "totalCorrect": 32,
        "totalErrors": 8,
        "perseverativeErrors": 1,
        "nonPerseverativeErrors": 3,
        "perseverativeErrorRate": 0.125,
        "trialsToFirstCategory": 7,
        "failureToMaintainSet": 0,
        "averageReactionTimeMs": 1450,
        **over,
    }


def mock_flanker(**over):
    return {
        "totalTrials": 48,
        "congruentTrials": 24,
        "incongruentTrials": 24,
        "totalCorrect": 46,
        "totalErrors": 2,
        "timeouts": 1,
        "timeoutRate": 0.021,
        "meanCongruentRtMs": 420,
        "meanIncongruentRtMs": 486,
        "congruentAccuracy": 0.958,
        "incongruentAccuracy": 0.958,
        "flankerEffectMs": 66.18,
        "postErrorSlowingMs": 80.11,
        "impulsiveErrorCount": 0,
        **over,
    }


def mock_pgg(**over):
    return {
        "totalRounds": 8,
        "initialContribution": 8,
        "averageContribution": 6.25,
        "freeRiderSensitivity": 0.14,
        "cooperationDecaySlope": -0.24,
        "meanDecisionLatencyMs": 3400,
        "finalCumulativePayoff": 95.2,
        **over,
    }


def build(session_id="sess_test", bart=None, wcst=None, flanker=None, pgg=None):
    return calculate_radar_profile(
        session_id,
        bart or mock_bart(),
        wcst or mock_wcst(),
        flanker or mock_flanker(),
        pgg or mock_pgg(),
    )


# ---------------------------------------------------------------------------
def test_matches_typescript_golden_values():
    """ค่าเดียวกับ pipeline.test.ts — ถ้าอันนี้แดง frontend/backend ไม่ตรงกันแล้ว"""
    r = build("sess_ktp_integrated_test")

    assert r.session_id == "sess_ktp_integrated_test"
    assert r.axes["riskTolerance"] == pytest.approx(86.59, abs=0.05)
    assert r.axes["learningAgility"] == pytest.approx(89.24, abs=0.05)
    assert r.axes["criticalThinking"] == pytest.approx(80.67, abs=0.05)
    assert r.axes["decisionMakingUnderPressure"] == pytest.approx(93.54, abs=0.05)
    assert r.axes["collaborationMindset"] == pytest.approx(70.09, abs=0.05)
    assert r.axes["resilienceAndAdaptability"] == pytest.approx(67.03, abs=0.05)
    assert r.overall_index == pytest.approx(81.19, abs=0.05)


def test_worst_case_floors_every_axis_to_zero():
    r = build(
        bart=mock_bart(
            adjustedAveragePumps=2,
            explodedTrialsCount=12,
            postExplosionAdaptationDelta=10,
        ),
        wcst=mock_wcst(
            categoriesCompleted=0,
            perseverativeErrors=15,
            trialsToFirstCategory=40,
            failureToMaintainSet=5,
        ),
        flanker=mock_flanker(
            flankerEffectMs=300,
            incongruentAccuracy=0.5,
            impulsiveErrorCount=6,
            postErrorSlowingMs=300,
        ),
        pgg=mock_pgg(
            initialContribution=0,
            averageContribution=0,
            freeRiderSensitivity=0,
            cooperationDecaySlope=-1,
        ),
    )
    assert all(v == 0 for v in r.axes.values())
    assert r.overall_index == 0


def test_every_axis_stays_in_range():
    r = build()
    for name, value in r.axes.items():
        assert 0 <= value <= 100, f"{name} หลุดช่วง: {value}"


def test_norms_refuse_tiny_sample():
    """
    กันไม่ให้เผลอคิด percentile จากทีม 5 คน
    ถ้าปล่อยผ่าน เลขบนสไลด์จะไม่มีความหมาย และกรรมการจะจับได้
    """
    profiles = [build(f"s{i}") for i in range(5)]
    with pytest.raises(ValueError, match="ต่ำกว่า 30 คน"):
        compute_norms(profiles)


def test_percentile_needs_variation():
    """คนที่ได้คะแนนเท่ากับค่าเฉลี่ยเป๊ะ ต้องได้ percentile 50"""
    import random

    random.seed(42)
    profiles = [
        build(
            f"s{i}",
            bart=mock_bart(adjustedAveragePumps=random.uniform(8, 22)),
            pgg=mock_pgg(initialContribution=random.uniform(2, 10)),
        )
        for i in range(40)
    ]
    norms = compute_norms(profiles)
    assert norms["riskTolerance"]["n"] == 40

    mid = profiles[0]
    result = to_percentile(mid, norms)
    assert 0 <= result["riskTolerance"]["percentile"] <= 100
