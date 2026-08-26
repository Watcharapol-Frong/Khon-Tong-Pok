"""
อ่านข้อความออกจากเรซูเม่ PDF

เรซูเม่ไทยแบ่งเป็น 2 แบบใหญ่ ๆ:
  1. export จาก Canva/Word -> มี text layer อ่านตรงได้
  2. สแกนหรือแคปหน้าจอ    -> เป็นภาพล้วน ต้อง OCR

ตัวที่ 2 เจอบ่อยกว่าที่คิด ถ้าไม่มี fallback จะได้ข้อความว่างแล้วผู้ใช้งงว่า
ทำไมระบบไม่เจอทักษะอะไรเลย
"""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# ถ้าอ่านได้ตัวอักษรน้อยกว่านี้ ถือว่า PDF เป็นภาพ ให้ไป OCR
MIN_CHARS_PER_PAGE = 80


def extract_text(pdf_bytes: bytes, tesseract_cmd: str = "") -> tuple[str, bool]:
    """
    คืน (ข้อความ, ใช้ OCR หรือไม่)

    ธง ocr_used สำคัญ — ต้องเก็บลง evidence_sources.ocr_used
    เพราะข้อความจาก OCR มี error rate สูงกว่า ตอนวิเคราะห์ผลต้องแยกกลุ่มดู
    """
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    text = "\n".join(pages).strip()

    avg = len(text) / max(len(pages), 1)
    if avg >= MIN_CHARS_PER_PAGE:
        doc.close()
        return text, False

    log.info("PDF มี text layer น้อย (%.0f ตัว/หน้า) — สลับไป OCR", avg)
    ocr_text = _ocr(doc, tesseract_cmd)
    doc.close()
    return ocr_text, True


def _ocr(doc, tesseract_cmd: str = "") -> str:
    import io

    import pytesseract
    from PIL import Image

    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    out = []
    for page in doc:
        # 300 dpi — ต่ำกว่านี้ตัวอักษรไทยที่มีวรรณยุกต์จะเพี้ยนเยอะ
        pix = page.get_pixmap(dpi=300)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        try:
            out.append(pytesseract.image_to_string(img, lang="tha+eng"))
        except pytesseract.TesseractNotFoundError:
            log.error(
                "ไม่พบ Tesseract — ติดตั้งจาก "
                "https://github.com/UB-Mannheim/tesseract/wiki "
                "แล้วตั้ง TESSERACT_CMD ใน .env"
            )
            return ""
        except pytesseract.TesseractError as exc:
            log.error("OCR ล้มเหลว (ติดตั้ง language pack 'tha' หรือยัง?): %s", exc)
            return ""

    return "\n".join(out).strip()
