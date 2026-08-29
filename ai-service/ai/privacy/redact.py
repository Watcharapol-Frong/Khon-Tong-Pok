"""
ลบข้อมูลส่วนตัวออกจากข้อความเรซูเม่ ก่อนที่ข้อความนั้นจะไปถึงที่อื่น

ทำไมต้องมีไฟล์นี้
-----------------
ก่อนหน้านี้หน้า /decoder แกะ PDF ในเบราว์เซอร์แล้วเก็บ "ข้อความดิบทั้งฉบับ"
ลง profile ตรง ๆ แปลว่าชื่อจริง เบอร์โทร อีเมล ที่อยู่บ้าน ของผู้สมัคร
ถูกเก็บลง DB และไหลต่อเข้าโมเดล ทั้งที่ทั้งทีมตกลงกันว่าแพลตฟอร์มนี้ "ไม่ดูตัวตน"

การลบทีหลังไม่ช่วยอะไร เพราะข้อมูลไปถึงปลายทางแล้ว — ต้องลบตั้งแต่ก่อนเขียนลง DB

สองชั้น ต่างเหตุผลกัน
---------------------
  tier="pii"   ความปลอดภัย  — ชื่อ เบอร์ อีเมล ที่อยู่ เลขบัตร ลิงก์โปรไฟล์
                              ต่อให้ระบบหลุด ข้อมูลพวกนี้ก็ไม่ควรอยู่ในนั้นตั้งแต่แรก
  tier="bias"  ความเป็นธรรม — เกรด มหาวิทยาลัย คณะ อายุ เพศ
                              ตรงกับกติกาข้อ 1 ใน ai/llm/prompts.py
                              ห้ามถามในแชท -> ก็ต้องห้ามแอบเข้ามาทางไฟล์แนบด้วย

ลำดับสำคัญมาก
-------------
ต้อง redact **ก่อน** สกัดทักษะเสมอ ไม่ใช่หลัง
เพราะ extracted_skills.char_start/char_end ชี้กลับไปที่ raw_text ที่เก็บใน DB
ถ้าสกัดจากข้อความเต็มแล้วค่อยลบ พิกัดจะเลื่อนทั้งหมด ปุ่ม "ทักษะนี้มาจากไหน"
จะไฮไลต์ผิดตำแหน่ง — พังแบบเงียบ ๆ ที่หน้าเว็บไม่มีทางรู้

ข้อจำกัดที่ต้องพูดตรง ๆ
-----------------------
regex ไม่ใช่ NER — ชื่อคนไทยที่เขียนติดกัน ไม่มีคำนำหน้า และไม่ได้อยู่บรรทัดหัว
ยังหลุดได้ ตัวนี้จึงเป็น "ด่านแรก" ไม่ใช่หลักประกัน ห้ามเอาไปเคลมว่ากันได้ 100%
ถ้าจะให้แน่นกว่านี้ต้องเทรน NER ชื่อคน ซึ่งอยู่ในแผนหลัง pitch
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# ป้ายที่ใส่แทนของเดิม — จงใจให้อ่านออกว่า "มีของถูกลบตรงนี้"
# ถ้าลบทิ้งเฉย ๆ โมเดลจะอ่านประโยคขาด ๆ แล้วเดาเอาเองว่าตรงนั้นคืออะไร
# ---------------------------------------------------------------------------
PLACEHOLDER = {
    "email": "[อีเมล]",
    "phone": "[เบอร์โทร]",
    "thai_id": "[เลขบัตรประชาชน]",
    "address": "[ที่อยู่]",
    "name": "[ชื่อ]",
    "profile_url": "[ลิงก์โปรไฟล์]",
    "gpa": "[เกรด]",
    "university": "[สถาบันการศึกษา]",
    "faculty": "[สาขาวิชา]",
    "birth_date": "[วันเกิด]",
    "age": "[อายุ]",
    "gender": "[เพศ]",
}

TIER = {
    "email": "pii",
    "phone": "pii",
    "thai_id": "pii",
    "address": "pii",
    "name": "pii",
    "profile_url": "pii",
    "gpa": "bias",
    "university": "bias",
    "faculty": "bias",
    "birth_date": "bias",
    "age": "bias",
    "gender": "bias",
}

TH = r"฀-๿"  # ช่วง Unicode ของอักษรไทย

# ---------------------------------------------------------------------------
# ชั้น PII
# ---------------------------------------------------------------------------

# รองรับทั้ง user@mail.com และแบบที่คนเลี่ยง bot เขียน user [at] mail.com
EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+\-]+\s*(?:@|\[at\]|\(at\))\s*[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"
)

PROFILE_URL_RE = re.compile(
    r"(?:https?://)?(?:www\.)?"
    r"(?:linkedin\.com|facebook\.com|fb\.com|fb\.me|instagram\.com|"
    r"twitter\.com|x\.com|line\.me|tiktok\.com)"
    r"/[^\s,;)\]]*",
    re.I,
)

# LINE ID เป็นตัวระบุตัวตนพอ ๆ กับเบอร์โทรในบริบทไทย
LINE_ID_RE = re.compile(
    r"(?:LINE(?:\s*ID)?|ไลน์(?:\s*ไอดี)?)\s*[:：]?\s*@?[A-Za-z0-9._\-]{3,30}", re.I
)

# 13 หลัก เขียนติดกันหรือคั่นด้วย - หรือเว้นวรรค  (x-xxxx-xxxxx-xx-x)
THAI_ID_RE = re.compile(
    r"(?<![\d])\d[\s\-]?\d{4}[\s\-]?\d{5}[\s\-]?\d{2}[\s\-]?\d(?![\d])"
)

# เบอร์ที่มีคำนำหน้า — จับก่อนเพราะขอบเขตกว้างกว่าและแม่นกว่าเบอร์ลอย
LABELED_PHONE_RE = re.compile(
    r"(?:โทรศัพท์|โทร|เบอร์(?:โทร)?(?:ติดต่อ)?|มือถือ|Tel|Telephone|Mobile|Phone|Contact)"
    r"\s*[.:：]?\s*"
    r"[\d][\d\s\-.()+]{7,19}\d",
    re.I,
)

# เบอร์ลอย ๆ ที่ไม่มีคำนำหน้า: 0812345678 / 081-234-5678 / +66 81 234 5678
BARE_PHONE_RE = re.compile(
    r"(?<![\d\w])"
    r"(?:\+\s?66[\s\-.]?|0)"
    r"\(?\d{1,2}\)?[\s\-.]?"
    r"\d{3}[\s\-.]?"
    r"\d{3,4}"
    r"(?![\d])"
)

# คำที่บอกว่าบรรทัดนี้เป็นที่อยู่ — ที่อยู่ไทยมีหลายส่วน เลยตัดทั้งบรรทัด
# ปลอดภัยกว่าเจาะเป็นคำ ๆ แล้วเหลือ "ซอย 5 เขตบางรัก" ค้างอยู่
ADDR_MARKERS = (
    "ที่อยู่", "บ้านเลขที่", "เลขที่", "หมู่ที่", "หมู่บ้าน", "ซอย", "ถนน",
    "ตำบล", "แขวง", "อำเภอ", "เขต", "จังหวัด", "รหัสไปรษณีย์",
)
ADDR_ABBR_RE = re.compile(r"(?:^|[\s,])(?:ซ|ถ|ต|อ|จ)\.\s?[฀-๿]")
ADDR_EN_RE = re.compile(
    r"\b(?:Road|Rd\.|Street|St\.|Soi|Moo|Sub-?district|Subdistrict|District|Province|Alley)\b",
    re.I,
)
POSTAL_RE = re.compile(r"(?<!\d)\d{5}(?!\d)")
MAX_ADDRESS_LINE = 200  # ยาวกว่านี้คือย่อหน้า ไม่ใช่ที่อยู่

# "ชื่อ: สมชาย ใจดี"  แต่ต้องไม่โดน "ชื่อโครงการ:" "ชื่อบริษัท:"
NAME_LABEL_RE = re.compile(
    r"(?:ชื่อ(?!โครงการ|บริษัท|ตำแหน่ง|ผลงาน|วิชา|หลักสูตร|ทีม|ระบบ|ไฟล์)"
    r"(?:[\s\-]*(?:นามสกุล|สกุล|จริง|เล่น))?|Full\s*Name|Name|Applicant)"
    r"\s*[:：]\s*[^\n]{1,60}",
    re.I,
)

# คำนำหน้าไทยเขียนติดชื่อได้ (นายสมชาย) เลยต้องกันคำที่ขึ้นต้นเหมือนกันแต่ไม่ใช่ชื่อ
NAME_TITLED_TH_RE = re.compile(
    r"(?:นางสาว|นาง(?!สาว)|นาย(?!จ้าง|หน้า|ทะเบียน|ทุน|ประกัน)|น\.ส\.|ด\.ช\.|ด\.ญ\.|ว่าที่ร้อยตรี)"
    r"\s*[฀-๿]{2,}(?:\s+[฀-๿]{2,})?"
)
NAME_TITLED_EN_RE = re.compile(
    r"\b(?:Mr|Mrs|Ms|Miss)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}"
)

# ---------------------------------------------------------------------------
# ชั้น bias — ตรงกับข้อห้ามใน INTERVIEWER_SYSTEM
# ---------------------------------------------------------------------------
GPA_RE = re.compile(
    r"(?:GPAX|GPA|เกรดเฉลี่ย(?:สะสม)?|เกรด|ผลการเรียน|Grade\s*Point)"
    r"\s*[:：]?\s*(?:=\s*)?\d(?:\.\d{1,2})?(?:\s*/\s*4(?:\.\d{1,2})?)?",
    re.I,
)

# มหาวิทยาลัยไทยที่ชื่อไม่ได้ขึ้นต้นด้วยคำว่า "มหาวิทยาลัย"
KNOWN_UNI = (
    "จุฬาลงกรณ์", "ธรรมศาสตร์", "เกษตรศาสตร์", "มหิดล", "ศิลปากร",
    "ศรีนครินทรวิโรฒ", "สงขลานครินทร์", "พระจอมเกล้า", "ลาดกระบัง",
    "บางมด", "รามคำแหง", "อัสสัมชัญ",
)
UNIVERSITY_RE = re.compile(
    # ไม่กินคำถัดไปที่มีเว้นวรรค เพราะคำไทยเขียนติดกันอยู่แล้ว
    # ถ้าปล่อยให้กิน "มหาวิทยาลัยเกษตรศาสตร์ คณะวิศวกรรมศาสตร์" จะกลายเป็นก้อนเดียว
    # แล้วรายงานจะบอกว่า faculty = 0 ทั้งที่ลบไปแล้ว = ตัวเลขที่เอาไปโชว์ผิด
    # กรณีที่เขียนแยก เช่น "มหาวิทยาลัย ธรรมศาสตร์" ตัวหลังมีใน KNOWN_UNI รับต่ออยู่แล้ว
    r"(?:มหาวิทยาลัย|วิทยาลัย|สถาบันเทคโนโลยี|โรงเรียน)[฀-๿]*"
    r"|(?:" + "|".join(KNOWN_UNI) + r")"
    r"|\bUniversity\s+of\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?"
    r"|\b[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2}\s+(?:University|College)\b"
)
FACULTY_RE = re.compile(
    r"(?:คณะ|ภาควิชา|สาขาวิชา|หลักสูตร)[฀-๿]*(?:\s+[฀-๿]+){0,2}"
    r"|Faculty\s+of\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,2}"
    r"|(?:Bachelor|Master)(?:'s)?\s+(?:Degree\s+)?(?:of|in)\s+[A-Za-z]+(?:\s+[A-Za-z]+){0,2}"
)
BIRTH_RE = re.compile(
    r"(?:วัน\s*เดือน\s*ปีเกิด|วันเกิด|เกิดวันที่|เกิดเมื่อ|Date\s*of\s*Birth|D\.?O\.?B\.?)"
    r"\s*[:：]?\s*[^\n]{0,25}",
    re.I,
)
AGE_RE = re.compile(r"อายุ\s*\d{1,2}\s*(?:ปี)?|\bAge\s*[:：]?\s*\d{1,2}\b", re.I)

# แยกฝั่งไทยกับฝั่งอังกฤษ เพราะ \b ใช้กับคำไทยไม่ได้
# Python ถือว่าอักษรไทยเป็น word char แต่ JavaScript ไม่ถือ ตัวเดียวกันจึงให้ผลต่างกัน
# (ฝั่งเว็บมี regex ชุดเดียวกันอยู่ที่ frontend/src/lib/redact.ts)
GENDER_RE = re.compile(
    r"เพศ\s*[:：]?\s*(?:ชาย|หญิง)"
    r"|(?:Gender|Sex)\s*[:：]?\s*(?:Male|Female|M|F)(?![A-Za-z])",
    re.I,
)

# ---------------------------------------------------------------------------
# ป้ายที่ใส่ไปแล้วต้องไม่โดนลบซ้ำ
#
# เจอตอนเทียบผลระหว่าง Python กับ TypeScript: ป้าย "[สาขาวิชา]" มีคำว่า
# "สาขาวิชา" อยู่ในตัวเอง ซึ่งตรงกับ FACULTY_RE พอดี รันซ้ำอีกรอบจึงกลายเป็น
# "[[สาขาวิชา]]" แล้วรอบต่อไปก็ซ้อนไปเรื่อย ๆ
#
# สำคัญเพราะฝั่งเว็บ redact แล้วส่งมาให้ backend redact ซ้ำอีกที
# แทนที่จะไปไล่แก้คำในป้ายทีละอัน (ซึ่งพังใหม่ทุกครั้งที่เพิ่มป้าย)
# ให้จองพื้นที่ของป้ายไว้ตั้งแต่แรก แล้วห้าม rule อื่นแตะ
# ---------------------------------------------------------------------------
PLACEHOLDER_RE = re.compile(
    r"\[(?:" + "|".join(re.escape(v[1:-1]) for v in PLACEHOLDER.values()) + r")\]"
)
KEEP = "__keep__"  # ไม่ใช่ชนิดของข้อมูล แต่เป็นเครื่องหมายว่า "ตรงนี้จองแล้ว"

# ---------------------------------------------------------------------------
# หาชื่อจากบรรทัดหัวเรซูเม่
# ---------------------------------------------------------------------------
# ตรรกะเดียวกับ guessNameFromResumeText() ใน frontend/src/lib/pdf.ts
# เรซูเม่เกือบทุกฉบับขึ้นต้นด้วยชื่อตัวเองเป็นบรรทัดสั้น ๆ ที่ไม่ใช่หัวข้อ
NOT_A_NAME_RE = re.compile(
    r"@|https?://|www\.|\d{3}"
    r"|resume|curriculum|^cv$|profile|objective|summary|address|experience"
    r"|education|employment|work\s+history|skills?|qualification|certification"
    r"|project|reference|language|publication|award|interest|hobb"
    r"|ประวัติ|ประสบการณ์|การศึกษา|ทักษะ|ที่อยู่|เบอร์|อีเมล|ติดต่อ|วัตถุประสงค์",
    re.I,
)
HEADER_SCAN_LINES = 24

# จำนวนบรรทัดขั้นต่ำที่ยอมให้เดาชื่อจากหัวกระดาษ
#
# ข้อความสั้น ๆ ไม่กี่บรรทัดไม่ใช่เรซูเม่ มันคือข้อความที่ผู้ใช้พิมพ์ในแชท
# หรือชิ้นส่วนที่เราส่งมาทดสอบ ถ้าเดาชื่อจากพวกนี้ด้วย บรรทัดอย่าง
# "ใช้ React, TypeScript, PostgreSQL" จะโดนลบทั้งบรรทัดเพราะมันสั้นและมี 3 คำ
MIN_LINES_FOR_HEADER_GUESS = 3

# ชื่อคนไม่มีตัวเลขและไม่มีเครื่องหมายพวกนี้ — ถ้าเจอ แปลว่าเป็นบรรทัดอย่างอื่น
# (รายการเทคโนโลยีคั่นด้วยจุลภาค หัวข้อที่มีเครื่องหมาย ฯลฯ)
NOT_IN_A_NAME_RE = re.compile(r"[0-9,;:|/\\()\[\]{}#&%+=*\"<>@]")


def guess_header_name(text: str) -> str | None:
    lines = [ln for ln in text.split("\n") if ln.strip()]
    if len(lines) < MIN_LINES_FOR_HEADER_GUESS:
        return None

    for raw in lines[:HEADER_SCAN_LINES]:
        line = raw.strip(" \t|·•-—:")
        if not line:
            continue
        if not (2 <= len(line) <= 40):
            continue
        if NOT_A_NAME_RE.search(line) or NOT_IN_A_NAME_RE.search(line):
            continue
        words = line.split()
        if not (1 <= len(words) <= 4):
            continue
        # ต้องมีตัวอักษรจริง ไม่ใช่บรรทัดสัญลักษณ์หรือเส้นคั่น
        if not re.search(r"[฀-๿A-Za-z]{2,}", line):
            continue
        # ชื่อที่เขียนด้วยอักษรละตินในเรซูเม่เขียนขึ้นต้นตัวใหญ่เสมอ
        # เงื่อนไขนี้กันบรรทัดอย่าง "python sql excel" ไม่ให้ถูกมองเป็นชื่อ
        if re.fullmatch(r"[A-Za-z\s.'\-]+", line) and not all(
            w[0].isupper() for w in words if w[0].isalpha()
        ):
            continue
        return line
    return None


# ---------------------------------------------------------------------------
@dataclass
class Redaction:
    kind: str
    tier: str
    start: int   # พิกัดในข้อความ "ต้นฉบับ"
    end: int
    original_len: int


@dataclass
class RedactionResult:
    text: str
    redactions: list[Redaction] = field(default_factory=list)

    @property
    def counts(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.redactions:
            out[r.kind] = out.get(r.kind, 0) + 1
        return out

    @property
    def report(self) -> dict:
        """เก็บลง evidence_sources.redaction_report — ไว้ตอบกรรมการว่าลบอะไรไปบ้าง"""
        c = self.counts
        return {
            "total": len(self.redactions),
            "pii": sum(v for k, v in c.items() if TIER.get(k) == "pii"),
            "bias": sum(v for k, v in c.items() if TIER.get(k) == "bias"),
            "by_kind": c,
        }

    def summary_th(self) -> str:
        c = self.counts
        if not c:
            return "ไม่พบข้อมูลส่วนตัวที่ต้องลบ"
        label = {
            "email": "อีเมล", "phone": "เบอร์โทร", "name": "ชื่อ",
            "address": "ที่อยู่", "thai_id": "เลขบัตรประชาชน",
            "profile_url": "ลิงก์โปรไฟล์", "gpa": "เกรด",
            "university": "สถาบันการศึกษา", "faculty": "สาขาวิชา",
            "birth_date": "วันเกิด", "age": "อายุ", "gender": "เพศ",
        }
        parts = [f"{label.get(k, k)} {v} จุด" for k, v in sorted(c.items())]
        return "ลบออกแล้ว: " + " · ".join(parts)


# ---------------------------------------------------------------------------
def _address_line_spans(text: str) -> list[tuple[int, int]]:
    """หาบรรทัดที่หน้าตาเป็นที่อยู่ แล้วคืนพิกัดทั้งบรรทัด"""
    spans: list[tuple[int, int]] = []
    pos = 0
    for line in text.split("\n"):
        start, end = pos, pos + len(line)
        pos = end + 1  # +1 คือ \n ที่ split กินไป

        stripped = line.strip()
        if not stripped or len(stripped) > MAX_ADDRESS_LINE:
            continue

        score = sum(1 for m in ADDR_MARKERS if m in line)
        score += len(ADDR_ABBR_RE.findall(line))
        score += 1 if ADDR_EN_RE.search(line) else 0
        if POSTAL_RE.search(line) and score >= 1:
            score += 1

        # ขึ้นต้นด้วย "ที่อยู่" ชัดเจนพอแล้ว ไม่ต้องรอครบ 2 สัญญาณ
        if stripped.startswith("ที่อยู่") or score >= 2:
            spans.append((start, end))
    return spans


def _name_occurrence_spans(text: str, name: str) -> list[tuple[int, int]]:
    """ชื่อจากบรรทัดหัวมักโผล่ซ้ำใน header/footer ทุกหน้า — ต้องลบให้หมด"""
    if not name or len(name) < 2:
        return []
    return [m.span() for m in re.finditer(re.escape(name), text)]


def redact(
    text: str,
    *,
    redact_pii: bool = True,
    redact_bias: bool = True,
) -> RedactionResult:
    """
    คืนข้อความที่ลบข้อมูลส่วนตัวแล้ว พร้อมรายงานว่าลบอะไรไปกี่จุด

    ค่าเริ่มต้นเปิดทั้งสองชั้น — ถ้าจะปิดต้องตั้งใจปิดเอง ไม่ใช่ลืมเปิด
    """
    if not text:
        return RedactionResult(text="")

    # (kind, spans) เรียงตาม "ใครกินขอบเขตกว้างกว่า" มาก่อน
    # ตัวที่มาก่อนชนะเมื่อพิกัดทับกัน เช่นอีเมลต้องชนะเบอร์โทร
    # ไม่งั้น "user2024@mail.com" จะโดนตัดกลางคำ
    # ป้ายที่มีอยู่แล้วต้องมาก่อนทุก rule เพื่อจองที่ไว้ก่อนใครทั้งหมด
    rules: list[tuple[str, list[tuple[int, int]]]] = [
        (KEEP, [m.span() for m in PLACEHOLDER_RE.finditer(text)])
    ]

    if redact_pii:
        rules += [
            ("email", [m.span() for m in EMAIL_RE.finditer(text)]),
            ("profile_url", [m.span() for m in PROFILE_URL_RE.finditer(text)]),
            ("profile_url", [m.span() for m in LINE_ID_RE.finditer(text)]),
            ("address", _address_line_spans(text)),
            ("name", [m.span() for m in NAME_LABEL_RE.finditer(text)]),
            ("thai_id", [m.span() for m in THAI_ID_RE.finditer(text)]),
            ("phone", [m.span() for m in LABELED_PHONE_RE.finditer(text)]),
            ("phone", [m.span() for m in BARE_PHONE_RE.finditer(text)]),
            ("name", [m.span() for m in NAME_TITLED_TH_RE.finditer(text)]),
            ("name", [m.span() for m in NAME_TITLED_EN_RE.finditer(text)]),
        ]
        header_name = guess_header_name(text)
        if header_name:
            rules.append(("name", _name_occurrence_spans(text, header_name)))

    if redact_bias:
        rules += [
            ("university", [m.span() for m in UNIVERSITY_RE.finditer(text)]),
            ("faculty", [m.span() for m in FACULTY_RE.finditer(text)]),
            ("birth_date", [m.span() for m in BIRTH_RE.finditer(text)]),
            ("gpa", [m.span() for m in GPA_RE.finditer(text)]),
            ("age", [m.span() for m in AGE_RE.finditer(text)]),
            ("gender", [m.span() for m in GENDER_RE.finditer(text)]),
        ]

    # แบนออกมาพร้อมลำดับความสำคัญ (ตัวเลขน้อย = มาก่อน = ชนะ)
    flat: list[tuple[int, int, int, str]] = []
    for priority, (kind, spans) in enumerate(rules):
        for start, end in spans:
            if end > start:
                flat.append((start, end, priority, kind))

    # เรียงตามตำแหน่ง -> ลำดับความสำคัญ -> ยาวกว่าชนะ
    flat.sort(key=lambda t: (t[0], t[2], -(t[1] - t[0])))

    chosen: list[tuple[int, int, str]] = []
    cursor = 0
    for start, end, _prio, kind in flat:
        if start < cursor:      # ทับกับอันที่เลือกไปแล้ว -> ข้าม
            continue
        chosen.append((start, end, kind))
        cursor = end

    out: list[str] = []
    redactions: list[Redaction] = []
    last = 0
    for start, end, kind in chosen:
        out.append(text[last:start])
        if kind == KEEP:
            # ป้ายเดิม — คัดลอกไปตามเดิม ไม่นับเป็นการลบรอบใหม่
            out.append(text[start:end])
        else:
            out.append(PLACEHOLDER[kind])
            redactions.append(
                Redaction(kind=kind, tier=TIER[kind], start=start, end=end,
                          original_len=end - start)
            )
        last = end
    out.append(text[last:])

    return RedactionResult(text="".join(out), redactions=redactions)
