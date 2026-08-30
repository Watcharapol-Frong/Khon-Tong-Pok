"""
เทสต์ตัวลบข้อมูลส่วนตัว

    pytest tests/test_redact.py -v

ไฟล์นี้ไม่ใช่เทสต์ประดับ — มันคือหลักฐานเดียวที่พิสูจน์คำเคลมหลักของทีม
ว่าแพลตฟอร์ม "ไม่ดูตัวตน" ถ้าเทสต์ในนี้แดง แปลว่าคำเคลมนั้นไม่จริง ณ ตอนนั้น

แบ่งเป็น 3 กลุ่ม ซึ่งขัดกันเองโดยธรรมชาติ:
  1. ต้องลบให้หมด        (ปล่อยหลุด = ผิดสัญญากับผู้ใช้)
  2. ต้องไม่ลบเกิน       (ลบทักษะทิ้ง = ระบบไร้ประโยชน์)
  3. พฤติกรรมต้องคงที่   (พิกัด/ซ้ำซ้อน — พังแล้วไม่มีใครเห็น)

กลุ่ม 2 สำคัญพอ ๆ กับกลุ่ม 1 regex ที่ลบทุกอย่างผ่านกลุ่ม 1 ได้เต็มแต่ทำให้
"ดูแลระบบ stock ด้วย Python" หายไปด้วย = เราไม่เหลืออะไรให้สกัดทักษะ
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.privacy.redact import PLACEHOLDER, guess_header_name, redact  # noqa: E402


# ===========================================================================
# 1. ต้องลบให้หมด
# ===========================================================================
@pytest.mark.parametrize(
    "text,leaked",
    [
        ("ติดต่อ somchai.j@gmail.com ได้เลย", "somchai.j@gmail.com"),
        ("อีเมล: work.mail+cv@company.co.th", "work.mail+cv@company.co.th"),
        ("โทร 081-234-5678", "081-234-5678"),
        ("มือถือ 0812345678", "0812345678"),
        ("เบอร์ติดต่อ 02-123-4567", "02-123-4567"),
        ("Tel: +66 81 234 5678", "81 234 5678"),
        ("เลขบัตรประชาชน 1-2345-67890-12-3", "1-2345-67890-12-3"),
        ("เลขประจำตัว 1234567890123", "1234567890123"),
        ("https://www.linkedin.com/in/somchai-jaidee", "linkedin.com/in/somchai-jaidee"),
        ("LINE ID: somchai_dev", "somchai_dev"),
        ("ชื่อ: สมชาย ใจดี", "สมชาย ใจดี"),
        ("ชื่อ-นามสกุล : สมหญิง รักงาน", "สมหญิง รักงาน"),
        ("นายสมชาย ใจดี", "สมชาย"),
        ("นางสาวสมหญิง รักงาน", "สมหญิง"),
        ("Mr. John Smith", "John Smith"),
        ("ที่อยู่ 99/1 หมู่ 4 ซอยลาดพร้าว 15 เขตจตุจักร กรุงเทพฯ 10900", "ลาดพร้าว"),
        ("บ้านเลขที่ 12 ถนนสุขุมวิท แขวงคลองเตย 10110", "สุขุมวิท"),
    ],
)
def test_pii_is_removed(text: str, leaked: str) -> None:
    assert leaked not in redact(text).text


@pytest.mark.parametrize(
    "text,leaked",
    [
        ("GPA 3.45", "3.45"),
        ("เกรดเฉลี่ย 2.98", "2.98"),
        ("GPAX: 3.75/4.00", "3.75"),
        ("มหาวิทยาลัยเกษตรศาสตร์", "เกษตรศาสตร์"),
        ("จุฬาลงกรณ์มหาวิทยาลัย", "จุฬาลงกรณ์"),
        ("Faculty of Engineering", "Engineering"),
        ("คณะวิศวกรรมศาสตร์", "วิศวกรรมศาสตร์"),
        ("อายุ 24 ปี", "24"),
        ("เพศ ชาย", "ชาย"),
        ("วันเกิด 12 มีนาคม 2545", "2545"),
    ],
)
def test_bias_fields_are_removed(text: str, leaked: str) -> None:
    """
    ข้อมูลกลุ่มนี้ไม่ได้อันตรายเรื่องความปลอดภัย แต่ผิดกติกาข้อ 1 ของทีม
    ห้ามถามในแชท -> ก็ต้องห้ามเข้ามาทางไฟล์แนบด้วย ไม่งั้นกันแค่ประตูหน้า
    """
    assert leaked not in redact(text).text


def test_bias_can_be_kept_on_purpose() -> None:
    """ปิดได้ แต่ต้องตั้งใจปิด — ใช้ตอนวิเคราะห์ fairness ย้อนหลังเท่านั้น"""
    out = redact("GPA 3.45 มหาวิทยาลัยมหิดล", redact_bias=False).text
    assert "3.45" in out


# ===========================================================================
# 2. ต้องไม่ลบเกิน
# ===========================================================================
@pytest.mark.parametrize(
    "text,must_keep",
    [
        ("ดูแลระบบ stock ด้วย Python และ SQL", "Python"),
        ("เขียน dashboard ด้วย Power BI ให้ทีมขาย 12 คน", "Power BI"),
        ("ลดเวลาปิดงบจาก 5 วันเหลือ 2 วัน", "ลดเวลาปิดงบ"),
        ("เพิ่มยอดขาย 30% ใน 6 เดือน", "30%"),
        ("ดูแลลูกค้า 500 คนต่อเดือน", "500"),
        ("ใช้ React, TypeScript, PostgreSQL", "PostgreSQL"),
        ("ทำงานกับทีม 5 คน แบ่งงานผ่าน Jira", "Jira"),
        ("นายจ้างเดิมให้ดูแลสต๊อกสินค้า", "ดูแลสต๊อก"),
        ("จัดการ deploy ด้วย Docker บน AWS EC2", "Docker"),
    ],
)
def test_real_content_survives(text: str, must_keep: str) -> None:
    assert must_keep in redact(text).text


def test_numbers_in_achievements_are_not_phone_numbers() -> None:
    """
    ตัวเลขความสำเร็จคือหัวใจของ STAR ถ้า regex เบอร์โทรกินตัวเลขพวกนี้
    เรซูเม่จะเหลือแต่ประโยคลอย ๆ ซึ่งเป็นสิ่งที่ทั้งระบบพยายามหนีมาตลอด
    """
    text = "ปิดการขายได้ 2500000 บาท และลดต้นทุน 15000 บาทต่อเดือน"
    out = redact(text).text
    assert "2500000" in out
    assert "15000" in out


def test_years_are_not_treated_as_identifiers() -> None:
    out = redact("ทำงานที่บริษัท A ปี 2563 ถึง 2566").text
    assert "2563" in out and "2566" in out


# ===========================================================================
# 3. พฤติกรรมที่ต้องคงที่
# ===========================================================================
def test_placeholders_are_used_not_blank_deletion() -> None:
    """
    ลบทิ้งเฉย ๆ จะได้ประโยคขาด ๆ แล้วโมเดลเดาเองว่าตรงนั้นคืออะไร
    ป้ายที่อ่านออกบอกโมเดลว่า "ตรงนี้มีของ แต่คุณไม่ได้รับอนุญาตให้เห็น"
    """
    out = redact("ติดต่อ a@b.com").text
    assert PLACEHOLDER["email"] in out


@pytest.mark.parametrize(
    "text",
    [
        "โทร 081-234-5678 อีเมล a@b.com ชื่อ: สมชาย ใจดี",
        # ป้าย "[สาขาวิชา]" มีคำว่า "สาขาวิชา" อยู่ในตัวเอง ซึ่งตรงกับ FACULTY_RE พอดี
        # เคสนี้เคยทำให้รอบสองได้ "[[สาขาวิชา]]" แล้วซ้อนไปเรื่อย ๆ ทุกรอบ
        "จบจากคณะวิศวกรรมศาสตร์ สาขาวิชาคอมพิวเตอร์",
        "GPA 3.45 มหาวิทยาลัยมหิดล เพศ ชาย อายุ 24 ปี",
        "ที่อยู่ 99/1 ซอยลาดพร้าว 15 เขตจตุจักร 10900",
    ],
)
def test_redaction_is_idempotent(text: str) -> None:
    """
    รันซ้ำต้องไม่เปลี่ยนอะไรอีก

    สำคัญเพราะฝั่งเว็บ redact แล้วส่งมาให้ backend redact ซ้ำอีกที
    ถ้าไม่ idempotent ป้ายที่ใส่ไปจะถูกตีความเป็นข้อมูลแล้วซ้อนกันไปเรื่อย ๆ
    """
    once = redact(text).text
    assert redact(once).text == once


def test_second_pass_reports_nothing_left_to_remove() -> None:
    """
    รอบสองต้องไม่นับว่าลบอะไรเพิ่ม ไม่งั้นตัวเลขที่เอาไปโชว์จะเฟ้อ
    ทุกครั้งที่ข้อความเดินผ่านระบบ
    """
    once = redact("อีเมล a@b.com คณะวิศวกรรมศาสตร์ GPA 3.5")
    twice = redact(once.text)
    assert twice.report["total"] == 0


def test_report_counts_match_what_was_removed() -> None:
    r = redact("a@b.com และ c@d.com โทร 0812345678")
    assert r.report["by_kind"]["email"] == 2
    assert r.report["by_kind"]["phone"] == 1
    assert r.report["pii"] == 3
    assert r.report["total"] == len(r.redactions)


def test_spans_never_overlap() -> None:
    """
    พิกัดทับกันแปลว่าประกอบข้อความกลับมาผิด แล้วตัวอักษรจะหายหรือซ้ำ
    ซึ่งทำให้ char_start/char_end ของทักษะเลื่อนตามไปด้วยทั้งฉบับ
    """
    r = redact(
        "นายสมชาย ใจดี\nอีเมล somchai@mail.com โทร 081-234-5678\n"
        "ที่อยู่ 1 ซอย 2 ถนน 3 เขตบางรัก 10500\nGPA 3.5 มหาวิทยาลัยมหิดล"
    )
    spans = sorted((x.start, x.end) for x in r.redactions)
    for (_, prev_end), (next_start, _) in zip(spans, spans[1:]):
        assert prev_end <= next_start


def test_empty_and_whitespace_input() -> None:
    assert redact("").text == ""
    assert redact("   \n  ").text.strip() == ""


def test_header_name_is_removed_everywhere_not_just_the_header() -> None:
    """ชื่อในหัวกระดาษมักซ้ำที่ท้ายทุกหน้า ลบแค่บรรทัดแรกไม่พอ"""
    text = "สมชาย ใจดี\n\nประสบการณ์\n- ทำ A\n\nสมชาย ใจดี | หน้า 2"
    out = redact(text).text
    assert "สมชาย ใจดี" not in out


def test_header_name_guess_skips_section_headings() -> None:
    assert guess_header_name("RESUME\nประสบการณ์ทำงาน\nสมชาย ใจดี") == "สมชาย ใจดี"
    assert guess_header_name("ประสบการณ์\nการศึกษา\nทักษะ") is None


def test_full_resume_end_to_end() -> None:
    """เคสรวม — เหมือนที่ผู้ใช้อัปโหลดจริง"""
    resume = """สมชาย ใจดี
โทร 081-234-5678 | somchai.j@gmail.com
ที่อยู่ 99/1 หมู่ 4 ซอยลาดพร้าว 15 แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900
การศึกษา มหาวิทยาลัยเกษตรศาสตร์ คณะวิศวกรรมศาสตร์ GPA 3.45

ประสบการณ์ทำงาน
- ดูแลระบบ stock ด้วย Python และ SQL ลดเวลาปิดงบจาก 5 วันเหลือ 2 วัน
- ทำ dashboard ด้วย Power BI ให้ทีมขาย 12 คนใช้ทุกวัน
"""
    r = redact(resume)

    for leaked in ("081-234-5678", "somchai.j@gmail.com", "ลาดพร้าว",
                   "เกษตรศาสตร์", "3.45", "สมชาย"):
        assert leaked not in r.text, f"ยังหลุด: {leaked}"

    for kept in ("Python", "SQL", "Power BI", "ลดเวลาปิดงบ", "12 คน"):
        assert kept in r.text, f"ลบเกิน หายไป: {kept}"

    assert r.report["pii"] >= 4
    assert r.report["bias"] >= 2
