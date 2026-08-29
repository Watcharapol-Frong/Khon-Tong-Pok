"""
อ่านข้อความออกจากเรซูเม่ PDF (ระดับล่าง — ตัวประกอบร่างอยู่ที่ ai/ocr/reader.py)

เรซูเม่ไทยแบ่งเป็น 2 แบบใหญ่ ๆ:
  1. export จาก Canva/Word -> มี text layer อ่านตรงได้ ฟรีและตรงเป๊ะ
  2. สแกนหรือแคปหน้าจอ    -> เป็นภาพล้วน ต้อง OCR

ตัวที่ 2 เจอบ่อยกว่าที่คิด ถ้าไม่มี fallback จะได้ข้อความว่างแล้วผู้ใช้งงว่า
ทำไมระบบไม่เจอทักษะอะไรเลย

ไฟล์นี้แยกเป็นฟังก์ชันเล็ก ๆ เพราะ ai/ocr/reader.py ต้องแทรกตรงกลาง:
อ่าน text layer ก่อน ถ้าไม่พอค่อยตัดสินใจว่าจะส่งไป Typhoon OCR หรือ Tesseract
ถ้ารวมทุกอย่างไว้ในฟังก์ชันเดียวจะแทรกตรงนั้นไม่ได้
"""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# ถ้าอ่านได้ตัวอักษรน้อยกว่านี้ต่อหน้า ถือว่า PDF เป็นภาพ ให้ไป OCR
MIN_CHARS_PER_PAGE = 80


def text_layer(pdf_bytes: bytes) -> tuple[str, float, int]:
    """คืน (ข้อความ, ตัวอักษรเฉลี่ยต่อหน้า, จำนวนหน้า) โดยไม่ OCR"""
    import fitz  # PyMuPDF

    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        pages = [page.get_text() for page in doc]

    text = "\n".join(pages).strip()
    n_pages = max(len(pages), 1)
    return text, len(text) / n_pages, len(pages)


NO_TESSERACT_MSG = (
    "ยังไม่ได้ติดตั้ง pytesseract — ตัวสำรอง OCR ใช้ไม่ได้ "
    "(pip install pytesseract แล้วลง Tesseract engine ด้วย)"
)


def tesseract_pdf(pdf_bytes: bytes, tesseract_cmd: str = "", max_pages: int = 4) -> str:
    """
    OCR ด้วย Tesseract — ตัวสำรองสุดท้ายเมื่อไม่มี Typhoon API key

    ทุกทางที่ล้มเหลวต้องคืนสตริงว่าง ไม่ใช่โยน exception
    เพราะนี่คือ "ทางสำรอง" ถ้ามันพังแล้วลากทั้ง request ตายไปด้วย
    ผู้ใช้จะเจอ 500 แทนที่จะเจอข้อความว่าอ่านไฟล์นี้ไม่ได้ ลองไฟล์อื่นดู
    """
    import io

    import fitz

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        log.warning(NO_TESSERACT_MSG)
        return ""

    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    out: list[str] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in list(doc)[:max_pages]:
            # 300 dpi — ต่ำกว่านี้วรรณยุกต์ไทยจะเพี้ยนเยอะ
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


def tesseract_image(image_bytes: bytes, tesseract_cmd: str = "") -> str:
    import io

    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        log.warning(NO_TESSERACT_MSG)
        return ""

    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    try:
        return pytesseract.image_to_string(
            Image.open(io.BytesIO(image_bytes)), lang="tha+eng"
        ).strip()
    except Exception as exc:  # noqa: BLE001
        log.error("OCR รูปภาพล้มเหลว: %s", exc)
        return ""


def extract_text(pdf_bytes: bytes, tesseract_cmd: str = "") -> tuple[str, bool]:
    """
    คืน (ข้อความ, ใช้ OCR หรือไม่) — เส้นทางเดิมที่ไม่ผ่าน Typhoon

    ยังอยู่เพื่อไม่ให้โค้ดเก่าพัง ของใหม่ให้ใช้ ai.ocr.reader.read_document()
    ซึ่งเรียก Typhoon OCR ก่อนแล้วค่อยตกมาที่ Tesseract

    ธง ocr_used สำคัญ — ต้องเก็บลง evidence_sources.ocr_used
    เพราะข้อความจาก OCR มี error rate สูงกว่า ตอนวิเคราะห์ผลต้องแยกกลุ่มดู
    """
    text, avg, _ = text_layer(pdf_bytes)
    if avg >= MIN_CHARS_PER_PAGE:
        return text, False

    log.info("PDF มี text layer น้อย (%.0f ตัว/หน้า) — สลับไป OCR", avg)
    return tesseract_pdf(pdf_bytes, tesseract_cmd), True
