"""
เทสต์เส้นทางอ่านไฟล์ -> ลบข้อมูลส่วนตัว

    pytest tests/test_resume_pipeline.py -v

จงใจไม่แตะขั้นสกัดทักษะ เพราะขั้นนั้นต้องโหลดโมเดลจาก HuggingFace
ซึ่งทำให้เทสต์ช้าและพังเวลาเน็ตไม่ดี — เอาไว้เทสต์แยกตอนมีโมเดลจริง

ที่นี่พิสูจน์ 2 อย่างที่พังเงียบได้ง่ายที่สุด:
  1. PDF ที่มี text layer ต้องไม่ถูกส่งไป OCR (เปลืองโควตาโดยไม่จำเป็น)
  2. ข้อความที่ออกจากขั้นนี้ต้องสะอาดพอที่จะเก็บลง JSON/Postgres ได้
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.ocr.reader import read_document  # noqa: E402
from ai.privacy.redact import redact  # noqa: E402

RESUME_LINES = [
    "สมชาย ใจดี",
    "โทร 081-234-5678  somchai.j@gmail.com",
    "ที่อยู่ 99/1 ซอยลาดพร้าว 15 เขตจตุจักร กรุงเทพฯ 10900",
    "การศึกษา มหาวิทยาลัยเกษตรศาสตร์ GPA 3.45",
    "ประสบการณ์",
    "ดูแลระบบ stock ด้วย Python และ SQL",
    "ทำ dashboard ด้วย Power BI ให้ทีมขาย 12 คน",
]


@pytest.fixture
def resume_pdf() -> bytes:
    fitz = pytest.importorskip("fitz", reason="ต้องมี PyMuPDF")

    doc = fitz.open()
    page = doc.new_page()
    # ฟอนต์ที่มากับ PyMuPDF วาดอักษรไทยไม่ได้ทุกตัว แต่ text layer ยังถูกฝังครบ
    # ซึ่งเป็นสิ่งเดียวที่เทสต์นี้สนใจ (เราไม่ได้เทสต์การเรนเดอร์)
    page.insert_text((40, 60), "\n".join(RESUME_LINES), fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def test_pdf_with_text_layer_never_calls_ocr(resume_pdf: bytes) -> None:
    """
    ถ้าเส้นทางนี้พลาดไป OCR โควตา Typhoon จะหมดตั้งแต่ทดสอบยังไม่ทันเสร็จ
    typhoon=None จึงหมายถึง "ถ้าจำเป็นต้อง OCR จะไม่มีอะไรให้ใช้"
    เทสต์ผ่าน = แปลว่ามันไม่ต้องใช้จริง ๆ
    """
    doc = read_document(resume_pdf, "resume.pdf", typhoon=None)

    assert doc.method == "text_layer"
    assert doc.ocr_used is False
    assert doc.ok


def test_end_to_end_pdf_to_redacted_text(resume_pdf: bytes) -> None:
    doc = read_document(resume_pdf, "resume.pdf", typhoon=None)
    red = redact(doc.text)

    assert "somchai.j@gmail.com" not in red.text
    assert "081-234-5678" not in red.text
    assert "3.45" not in red.text
    # ทักษะต้องรอด ไม่งั้นทั้ง pipeline ไม่มีประโยชน์
    assert "Python" in red.text


def test_output_survives_a_json_round_trip(resume_pdf: bytes) -> None:
    """
    เคยเจอมาแล้วตอนทำ corpus: PDF แถม U+2028/U+2029 มา ซึ่ง json.dumps
    ไม่ escape ให้ แต่ตัวอ่านบรรทัดดันตัดบรรทัดตรงนั้น ทำให้ไฟล์ที่เขียนไปแล้ว
    อ่านกลับไม่ได้ ("Unterminated string")

    ที่นี่ข้อความเดียวกันจะถูกยัดลง JSON response และ jsonb ใน Postgres
    ถ้าไม่ล้างตั้งแต่ต้นทาง จะไปพังที่ปลายทางแบบหาสาเหตุยาก
    """
    import json

    doc = read_document(resume_pdf, "resume.pdf", typhoon=None)
    text = redact(doc.text).text

    encoded = json.dumps({"text": text}, ensure_ascii=False)
    assert len(encoded.splitlines()) == 1
    assert json.loads(encoded)["text"] == text


def test_unknown_bytes_do_not_crash_the_endpoint_path() -> None:
    """ไฟล์เสียต้องได้ error ที่จับได้ ไม่ใช่ทำให้ทั้ง request ตาย"""
    with pytest.raises(Exception):
        read_document(b"this is not a pdf at all", "broken.pdf", typhoon=None)


def test_image_without_any_ocr_backend_reports_failure_clearly() -> None:
    """
    ไม่มีทั้ง Typhoon และ Tesseract ต้องคืน "อ่านไม่ได้" พร้อมเหตุผล
    ไม่ใช่คืนข้อความว่างเฉย ๆ แล้วผู้ใช้งงว่าทำไมไม่เจอทักษะ
    """
    png_1x1 = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
    )
    doc = read_document(png_1x1, "shot.png", typhoon=None, tesseract_cmd="")
    assert doc.ok is False
    assert doc.note
