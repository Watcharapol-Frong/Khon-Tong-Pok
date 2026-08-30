"""
Typhoon OCR — อ่านเรซูเม่ที่เป็นภาพสแกนหรือรูปถ่าย

ทำไมไม่ใช้ pytesseract อย่างเดียว
--------------------------------
Tesseract อ่านภาษาไทยได้ก็จริง แต่พังกับสิ่งที่เรซูเม่มีเต็มไปหมด:
ตาราง คอลัมน์คู่ ไอคอน หัวข้อที่จัดวางเป็นบล็อก — มันอ่านไล่ซ้ายไปขวาทั้งแถบ
ทำให้ข้อความจากคนละคอลัมน์ปนกันจนสกัดทักษะไม่ได้

Typhoon OCR เป็นโมเดล vision ที่ SCB10X เทรนกับเอกสารไทยโดยเฉพาะ
มันเข้าใจ layout แล้วคืนออกมาเป็น Markdown ที่ยังรักษาโครงเอกสารไว้

ทางเลือกที่พิจารณาแล้วไม่เอา
----------------------------
แพ็กเกจ `typhoon-ocr` อย่างเป็นทางการต้องมี poppler (pdftoppm/pdftotext)
ติดตั้งในเครื่องด้วย ซึ่งบน Windows ต้องโหลด binary มาวางเองแล้วตั้ง PATH
เราเรียก endpoint ตรง ๆ แล้วเรนเดอร์หน้าเป็นภาพด้วย PyMuPDF ที่มีอยู่แล้วแทน
ได้ผลเหมือนกันแต่ไม่ต้องลง native binary เพิ่ม — สำคัญเพราะทั้งทีมใช้ Windows

โควตา
-----
เอกสารของ Typhoon ระบุ 2 req/s และ 20 req/min
เรซูเม่ปกติ 1-2 หน้า = 1-2 request จึงไม่ชน แต่ต้องหน่วงระหว่างหน้าไว้
และจำกัดจำนวนหน้าไม่ให้ไฟล์ 50 หน้ามาดูดโควตาทีเดียวหมด
"""

from __future__ import annotations

import base64
import logging
import time

import httpx

log = logging.getLogger(__name__)

# ขอผลเป็น Markdown เพราะยังเก็บโครงหัวข้อ/บุลเล็ตไว้ ซึ่งชั้น A ใช้แบ่งประโยคต่อ
# ย้ำเรื่อง "ห้ามเติมข้อมูล" เพราะโมเดล vision ชอบเดาช่องที่อ่านไม่ออกให้ดูสมบูรณ์
# ซึ่งกับเรซูเม่แปลว่ามันแต่งทักษะที่ผู้สมัครไม่มีขึ้นมาเอง
OCR_PROMPT = (
    "อ่านเอกสารในภาพนี้แล้วถอดข้อความออกมาเป็น Markdown ตามที่เห็นจริง\n"
    "- รักษาลำดับการอ่านตาม layout ถ้าเป็นสองคอลัมน์ให้อ่านคอลัมน์ซ้ายจนจบก่อน\n"
    "- ตารางให้ถอดเป็นตาราง Markdown\n"
    "- ห้ามเติม สรุป หรือเดาข้อความที่ไม่มีในภาพเด็ดขาด ถ้าอ่านไม่ออกให้ข้ามไป\n"
    "- ตอบเฉพาะเนื้อหาเอกสาร ไม่ต้องมีคำอธิบายนำหรือปิดท้าย"
)

RENDER_DPI = 200          # พอสำหรับวรรณยุกต์ไทย โดยไฟล์ยังไม่ใหญ่จนช้า
PAGE_DELAY_SEC = 0.6      # กันชน rate limit 2 req/s


class TyphoonOCRError(RuntimeError):
    pass


class TyphoonOCR:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.opentyphoon.ai/v1",
        model: str = "typhoon-ocr",
        max_pages: int = 4,
        timeout: float = 90.0,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.max_pages = max_pages
        self.timeout = timeout

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    # -----------------------------------------------------------------
    def _call(self, image_png: bytes, hint: str = "") -> str:
        b64 = base64.b64encode(image_png).decode("ascii")

        content: list[dict] = [
            {"type": "image_url",
             "image_url": {"url": f"data:image/png;base64,{b64}"}},
        ]
        prompt = OCR_PROMPT
        if hint:
            # text layer ที่แกะได้บางส่วนใช้เป็น anchor ให้โมเดลสะกดคำเฉพาะถูก
            # (ชื่อเครื่องมือ ภาษาโปรแกรม) ซึ่งเป็นจุดที่ OCR ภาพล้วนพลาดบ่อยที่สุด
            prompt += (
                "\n\nข้อความบางส่วนที่แกะจากไฟล์ได้ (ใช้ช่วยสะกดคำเฉพาะให้ถูก "
                "แต่ยึดภาพเป็นหลัก):\n" + hint[:1500]
            )
        content.insert(0, {"type": "text", "text": prompt})

        try:
            resp = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": content}],
                    # OCR ต้องการความเที่ยง ไม่ใช่ความสร้างสรรค์
                    "temperature": 0.0,
                    "max_tokens": 4096,
                },
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise TyphoonOCRError(f"ต่อ Typhoon OCR ไม่ได้: {exc}") from exc

        if resp.status_code == 401:
            raise TyphoonOCRError("TYPHOON_API_KEY ไม่ถูกต้องหรือหมดอายุ")
        if resp.status_code == 429:
            raise TyphoonOCRError("Typhoon OCR ชนโควตา (2 req/s, 20 req/min) — รอสักครู่แล้วลองใหม่")
        if resp.status_code >= 400:
            raise TyphoonOCRError(
                f"Typhoon OCR ตอบ {resp.status_code}: {resp.text[:300]}"
            )

        data = resp.json()
        try:
            return (data["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError) as exc:
            raise TyphoonOCRError(f"รูปแบบคำตอบไม่ตรงที่คาด: {str(data)[:300]}") from exc

    # -----------------------------------------------------------------
    def ocr_pdf(self, pdf_bytes: bytes, hint: str = "") -> tuple[str, int]:
        """คืน (markdown, จำนวนหน้าที่อ่านจริง)"""
        import fitz  # PyMuPDF

        pages_text: list[str] = []
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            n = min(len(doc), self.max_pages)
            if len(doc) > self.max_pages:
                log.warning(
                    "ไฟล์มี %d หน้า — อ่านแค่ %d หน้าแรกเพื่อไม่ให้เปลืองโควตา",
                    len(doc), self.max_pages,
                )
            for i in range(n):
                if i:
                    time.sleep(PAGE_DELAY_SEC)
                pix = doc[i].get_pixmap(dpi=RENDER_DPI)
                pages_text.append(self._call(pix.tobytes("png"), hint if i == 0 else ""))

        return "\n\n".join(t for t in pages_text if t).strip(), n

    def ocr_image(self, image_bytes: bytes) -> str:
        """รูปถ่าย/สกรีนช็อตเรซูเม่ — แปลงเป็น PNG ก่อนเพราะ endpoint รับ PNG แน่นอน"""
        import io

        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return self._call(buf.getvalue())
