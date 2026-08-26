"""
เพิ่มจำนวนเรซูเม่ด้วย data augmentation

    # โหมด corpus — ข้อความดิบ ใช้ทำ domain-adaptive pretraining
    python train/augment_resumes.py --target 10000

    # โหมด labeled — ข้อมูลที่ label แล้ว ใช้ fine-tune NER (อันนี้คือตัวที่ดัน F1)
    python train/augment_resumes.py --mode labeled --target 10000

ทุกครั้งที่รันจะสร้างโฟลเดอร์ใหม่แยกออกมา ไม่ทับของเดิม:
    data/augmented/<mode>-<target>-<seed>-<วันเวลา>/

--------------------------------------------------------------------------
ทำไมต้องแยก 2 โหมด

โหมด labeled ต้อง "ขยับ offset ตาม" ทุกครั้งที่ข้อความเปลี่ยน ไม่งั้น span
จะชี้ผิดตำแหน่งแล้วโมเดลเรียนป้ายมั่วแบบเงียบ ๆ — เทรนเสร็จ F1 ต่ำโดยไม่รู้สาเหตุ
สคริปต์นี้เลยสร้างข้อความใหม่จาก "ชิ้นส่วน" เสมอ แล้วคำนวณ offset ใหม่จากชิ้นส่วน
ไม่มีการแก้ string ตรง ๆ แล้วเดา offset เอา และมีขั้นตรวจปิดท้ายทุกฉบับ
--------------------------------------------------------------------------
"""

from __future__ import annotations

import argparse
import json
import random
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from train.paths import AUGMENTED_DIR as OUT_ROOT, CORPUS_FILE, LABELED_DIR

THAI_RE = re.compile(r"[฀-๿]")


# ===========================================================================
# โครงสร้างข้อมูล
# ===========================================================================
@dataclass
class Entity:
    start: int
    end: int
    label: str


@dataclass
class Doc:
    text: str
    entities: list[Entity] = field(default_factory=list)
    meta: dict = field(default_factory=dict)

    def surface(self, ent: Entity) -> str:
        return self.text[ent.start : ent.end]

    def validate(self) -> list[str]:
        """ตรวจว่า offset ยังชี้ถูกที่อยู่ — เรียกทุกครั้งหลัง augment"""
        problems = []
        for e in self.entities:
            if not (0 <= e.start < e.end <= len(self.text)):
                problems.append(f"ช่วง ({e.start},{e.end}) หลุดขอบข้อความ {len(self.text)}")
            elif self.text[e.start : e.end].strip() != self.text[e.start : e.end]:
                problems.append(f"'{self.text[e.start:e.end]}' มีช่องว่างหัวท้าย")
        for a, b in zip(sorted(self.entities, key=lambda x: x.start),
                        sorted(self.entities, key=lambda x: x.start)[1:], strict=False):
            if a.end > b.start:
                problems.append(f"span ซ้อนกัน ({a.start},{a.end}) กับ ({b.start},{b.end})")
        return problems

    def to_json(self) -> dict:
        out = {
            "text": self.text,
            "entities": [
                {"start": e.start, "end": e.end, "label": e.label} for e in self.entities
            ],
        }
        out.update(self.meta)
        return out


# ===========================================================================
# แกน: แตกเป็นชิ้นส่วน -> แปลง -> ประกอบใหม่พร้อม offset ใหม่
#
# ทุก transform ที่เปลี่ยนความยาวข้อความต้องผ่านสองฟังก์ชันนี้เท่านั้น
# ห้ามแก้ doc.text ตรง ๆ แล้วบวกลบ offset เอง — พลาดง่ายมาก
# ===========================================================================
Segment = tuple[str, str | None]  # (ข้อความ, ป้าย) ป้าย None = ไม่ใช่ entity


def to_segments(doc: Doc) -> list[Segment]:
    segs: list[Segment] = []
    cursor = 0
    for ent in sorted(doc.entities, key=lambda e: e.start):
        if ent.start > cursor:
            segs.append((doc.text[cursor : ent.start], None))
        segs.append((doc.text[ent.start : ent.end], ent.label))
        cursor = ent.end
    if cursor < len(doc.text):
        segs.append((doc.text[cursor:], None))
    return segs


def from_segments(segs: list[Segment], meta: dict | None = None) -> Doc:
    parts: list[str] = []
    ents: list[Entity] = []
    pos = 0
    for text, label in segs:
        if not text:
            continue
        if label is not None:
            ents.append(Entity(pos, pos + len(text), label))
        parts.append(text)
        pos += len(text)
    return Doc("".join(parts), ents, meta or {})


# ===========================================================================
# ตัวช่วย
# ===========================================================================
def split_sentences(text: str) -> list[str]:
    """
    ตัดประโยคแบบรักษาตัวคั่นไว้ ทำให้ประกอบกลับได้เหมือนเดิมเป๊ะ
    ภาษาไทยไม่มีจุดจบประโยค เลยตัดที่ขึ้นบรรทัดใหม่และ bullet เป็นหลัก
    """
    pieces = re.split(r"(\n+|(?<=[.!?])\s+|(?<=[•·▪])\s*)", text)
    out, buf = [], ""
    for p in pieces:
        buf += p
        if p and (("\n" in p) or re.fullmatch(r"\s+", p)):
            out.append(buf)
            buf = ""
    if buf:
        out.append(buf)
    return [s for s in out if s]


def sentence_units(doc: Doc) -> list[Doc]:
    """หั่นเอกสารเป็นประโยค โดยแต่ละประโยคพก entity ของตัวเองไปด้วย (offset ในประโยค)"""
    units: list[Doc] = []
    cursor = 0
    for sent in split_sentences(doc.text):
        start, end = cursor, cursor + len(sent)
        # เก็บเฉพาะ entity ที่อยู่ในประโยคนี้ทั้งอัน — ตัวที่คร่อมประโยคจะถูกทิ้ง
        # (เกิดน้อยมาก และดีกว่าปล่อยให้ span ขาดครึ่ง)
        inner = [
            Entity(e.start - start, e.end - start, e.label)
            for e in doc.entities
            if e.start >= start and e.end <= end
        ]
        units.append(Doc(sent, inner))
        cursor = end
    return units


def join_units(units: list[Doc], meta: dict) -> Doc:
    segs: list[Segment] = []
    for u in units:
        segs.extend(to_segments(u))
    return from_segments(segs, meta)


# ===========================================================================
# ตัว augment
# ===========================================================================

# OCR สับสนตัวไหนกับตัวไหน — เลือกเฉพาะคู่ที่ "ความยาวเท่ากัน"
# เพื่อให้ offset ไม่ขยับเลย เป็นวิธีที่ปลอดภัยที่สุดสำหรับข้อมูลที่มี label
OCR_CONFUSIONS_TH = {
    "ำ": "า", "า": "ำ",
    "่": "้", "้": "่",
    "ั": "ํ", "ื": "ุ",
    "ด": "ค", "ค": "ด",
    "ข": "ฃ", "บ": "ป", "ป": "บ",
    "ท": "ฑ", "ฎ": "ฏ",
    "เ": "ใ", "ใ": "ไ", "ไ": "ใ",
    "ษ": "ฆ", "ฬ": "ห",
}
OCR_CONFUSIONS_EN = {
    "l": "1", "1": "l", "I": "1",
    "O": "0", "0": "O", "o": "0",
    "S": "5", "5": "S",
    "B": "8", "8": "B",
    "G": "6", "Z": "2", "2": "Z",
}


def aug_ocr_noise(doc: Doc, rng: random.Random, rate: float = 0.012) -> Doc:
    """
    จำลองความผิดพลาดของ OCR — แทนที่ทีละตัวอักษร ความยาวไม่เปลี่ยน offset จึงไม่ขยับ

    อันนี้ไม่ใช่ของเล่น: pipeline จริงของเรา OCR เรซูเม่ที่เป็นภาพ (ai/skill/pdf.py)
    ถ้าเทรนด้วยข้อความสะอาดล้วนแล้วเอาไปใช้กับข้อความจาก OCR = domain mismatch
    โมเดลจะพังทันทีกับเรซูเม่สแกน ซึ่งมีเยอะกว่าที่คิด
    """
    table = {**OCR_CONFUSIONS_TH, **OCR_CONFUSIONS_EN}
    chars = list(doc.text)
    for i, ch in enumerate(chars):
        if ch in table and rng.random() < rate:
            chars[i] = table[ch]
    return Doc("".join(chars), list(doc.entities), dict(doc.meta))


def aug_entity_swap(
    doc: Doc, pools: dict[str, list[str]], rng: random.Random, p: float = 0.35
) -> Doc:
    """
    สลับทักษะเป็นทักษะอื่นในป้ายเดียวกัน ("Python" -> "Java", "ดูแล stock" -> "จัดตารางเวร")

    **ตัวนี้สำคัญที่สุดในโหมด labeled** เพราะมันสอนโมเดลว่า
    "ตำแหน่งนี้ในประโยคคือที่ของทักษะ" แทนที่จะท่องจำว่า "คำว่า Python คือทักษะ"
    ซึ่งคือความแตกต่างระหว่างโมเดลที่ generalize ได้กับ lookup table
    """
    segs = to_segments(doc)
    out: list[Segment] = []
    for text, label in segs:
        if label and pools.get(label) and rng.random() < p:
            candidates = [c for c in pools[label] if c != text]
            if candidates:
                out.append((rng.choice(candidates), label))
                continue
        out.append((text, label))
    return from_segments(out, dict(doc.meta))


def aug_sentence_shuffle(doc: Doc, rng: random.Random) -> Doc:
    """
    สลับลำดับประโยค/บรรทัด — เรซูเม่จริงเรียงหัวข้อไม่เหมือนกันอยู่แล้ว
    บางคนขึ้น Education ก่อน บางคนขึ้น Experience ก่อน
    """
    units = sentence_units(doc)
    if len(units) < 3:
        return doc
    rng.shuffle(units)
    return join_units(units, dict(doc.meta))


def aug_sentence_dropout(doc: Doc, rng: random.Random, p: float = 0.15) -> Doc:
    """
    ตัดประโยคที่ไม่มีทักษะออกบ้าง — จำลองเรซูเม่ที่เขียนสั้นกว่า
    ประโยคที่มี entity จะไม่ถูกตัด (ไม่งั้นเสีย training signal ฟรี ๆ)
    """
    units = sentence_units(doc)
    kept = [u for u in units if u.entities or rng.random() > p]
    if len(kept) < 2:
        return doc
    return join_units(kept, dict(doc.meta))


FILLERS_TH = ["โดย", "ซึ่ง", "ทั้งนี้", "นอกจากนี้", "รวมถึง", "อีกทั้ง"]
FILLERS_EN = ["additionally", "furthermore", "moreover", "also", "in addition"]


def aug_filler_insert(doc: Doc, rng: random.Random, p: float = 0.2) -> Doc:
    """แทรกคำเชื่อมในช่วงที่ไม่ใช่ entity — เพิ่มความหลากหลายของบริบทรอบทักษะ"""
    is_thai = bool(THAI_RE.search(doc.text))
    fillers = FILLERS_TH if is_thai else FILLERS_EN
    joiner = "" if is_thai else " "

    out: list[Segment] = []
    for text, label in to_segments(doc):
        if label is None and len(text) > 20 and rng.random() < p:
            cut = rng.randrange(1, len(text))
            word = rng.choice(fillers)
            out.append((text[:cut] + joiner + word + joiner + text[cut:], None))
        else:
            out.append((text, label))
    return from_segments(out, dict(doc.meta))


def aug_number_jitter(doc: Doc, rng: random.Random, p: float = 0.4) -> Doc:
    """เปลี่ยนตัวเลขปี/จำนวน เช่น '3 ปี' -> '5 ปี' — เฉพาะนอก entity"""
    out: list[Segment] = []
    for text, label in to_segments(doc):
        if label is None and rng.random() < p:
            def bump(m: re.Match) -> str:
                n = int(m.group())
                if n > 3000:  # น่าจะเป็นปี ค.ศ./พ.ศ. อย่าไปยุ่ง
                    return m.group()
                return str(max(1, n + rng.choice([-2, -1, 1, 2, 3])))

            text = re.sub(r"\b\d{1,3}\b", bump, text)
        out.append((text, label))
    return from_segments(out, dict(doc.meta))


# ===========================================================================
# โหมด corpus — ข้อความดิบ ไม่มี label
# ===========================================================================
SECTION_RE = re.compile(
    r"\n(?=\s*(?:[A-Z][A-Z &/]{3,}|ประสบการณ์|การศึกษา|ทักษะ|ผลงาน|ประวัติ)\s*\n)"
)


def split_sections(text: str) -> list[str]:
    parts = [p for p in SECTION_RE.split(text) if p.strip()]
    return parts if len(parts) > 1 else [p for p in text.split("\n\n") if p.strip()]


def aug_section_shuffle(doc: Doc, rng: random.Random) -> Doc:
    secs = split_sections(doc.text)
    if len(secs) < 3:
        return doc
    head, rest = secs[0], secs[1:]  # หัวเรซูเม่ (ชื่อ/ตำแหน่ง) อยู่บนสุดเสมอ
    rng.shuffle(rest)
    return Doc("\n\n".join([head, *rest]), [], dict(doc.meta))


def aug_recombine(doc: Doc, other: Doc, rng: random.Random) -> Doc:
    """
    ผสมหัวข้อจากเรซูเม่ 2 ฉบับในสายอาชีพเดียวกัน
    ได้เรซูเม่ที่ไม่เคยมีอยู่จริงแต่ยังสมเหตุสมผล — เพิ่มความหลากหลายได้มากที่สุด
    """
    a, b = split_sections(doc.text), split_sections(other.text)
    if len(a) < 2 or len(b) < 2:
        return doc
    take_a = a[: max(1, len(a) // 2)]
    take_b = b[max(1, len(b) // 2) :]
    merged = [*take_a, *take_b]
    rng.shuffle(merged[1:])
    meta = dict(doc.meta)
    meta["recombined_with"] = other.meta.get("parent_id", "?")
    return Doc("\n\n".join(merged), [], meta)


# ===========================================================================
def build_pools(docs: list[Doc]) -> dict[str, list[str]]:
    """รวบรวมคลังทักษะจากข้อมูลที่ label แล้ว เอาไว้ใช้สลับ"""
    pools: dict[str, set[str]] = {}
    for d in docs:
        for e in d.entities:
            surface = d.surface(e).strip()
            if surface:
                pools.setdefault(e.label, set()).add(surface)
    return {k: sorted(v) for k, v in pools.items()}


def load_corpus(limit: int | None) -> list[Doc]:
    if not CORPUS_FILE.exists():
        raise SystemExit(
            f"ไม่พบ {CORPUS_FILE}\nรัน python train/ingest_resumes.py ก่อนครับ"
        )
    docs = []
    # ต้องวนไฟล์ทีละบรรทัด ห้ามใช้ splitlines() — มันตัดที่ / ด้วย
    # ซึ่งอยู่กลาง string ของ JSON ได้ แล้วจะพังแบบ "Unterminated string"
    fh = CORPUS_FILE.open(encoding="utf-8")
    for line in fh:
        if not line.strip():
            continue
        row = json.loads(line)
        docs.append(
            Doc(
                row["text"],
                [],
                {
                    "parent_id": row["id"],
                    "category": row.get("category", "UNKNOWN"),
                    "source": row.get("source", "?"),
                },
            )
        )
        if limit and len(docs) >= limit:
            break
    fh.close()
    return docs


def load_labeled() -> list[Doc]:
    files = [p for p in sorted(LABELED_DIR.glob("*.jsonl")) if p.stem not in {"train", "dev", "test"}]
    if not files:
        raise SystemExit(
            f"ไม่พบไฟล์ .jsonl ใน {LABELED_DIR}\n"
            "โหมด labeled ต้องมีข้อมูลที่ label แล้วก่อน — ดู train/labeling_guide.md"
        )
    docs = []
    for path in files:
        with path.open(encoding="utf-8") as fh:
            lines = [ln for ln in fh if ln.strip()]
        for i, line in enumerate(lines):
            row = json.loads(line)
            docs.append(
                Doc(
                    row["text"],
                    [Entity(e["start"], e["end"], e["label"]) for e in row.get("entities", [])],
                    {"parent_id": f"{path.stem}:{i}", "category": "LABELED"},
                )
            )
    return docs


# ===========================================================================
# จำนวนรอบที่ยอมให้สร้างของซ้ำติดต่อกันก่อนจะยอมแพ้
# ถ้าวนทั้ง base แล้วไม่ได้ของใหม่เลยติดกันหลายรอบ = ความหลากหลายตันแล้ว
STALL_LIMIT = 12


def _run_loop(
    base: list[Doc],
    target: int,
    make_one,
    seed_docs: list[Doc],
) -> tuple[list[Doc], dict]:
    """
    วนสร้างจนครบเป้า พร้อม **ตัดของซ้ำ** และหยุดเองเมื่อสร้างของใหม่ไม่ได้แล้ว

    ทำไมต้องตัดซ้ำ: augmentation ที่คืนข้อความเดิมซ้ำ ๆ ไม่ได้เพิ่มข้อมูลอะไรเลย
    แต่ทำให้โมเดลเห็นตัวอย่างเดิมบ่อยกว่าตัวอย่างอื่น = overfit ตัวอย่างนั้น
    แล้ว F1 ตกโดยหาสาเหตุไม่เจอ ยอมได้น้อยกว่าเป้าดีกว่าได้ครบแต่ซ้ำ
    """
    # กรองของซ้ำตั้งแต่ข้อมูลตั้งต้นด้วย — ไฟล์ที่แต่ละคน label มาอาจทับกันได้
    out: list[Doc] = []
    seen: set[str] = set()
    for d in seed_docs:
        if d.text not in seen:
            seen.add(d.text)
            out.append(d)

    stats: dict[str, int] = {}
    stats["_base_duplicates_dropped"] = len(seed_docs) - len(out)
    rejected = 0
    n_round = 0
    stalls = 0

    while len(out) < target and stalls < STALL_LIMIT:
        n_round += 1
        added_this_round = 0

        for src in base:
            if len(out) >= target:
                break

            doc, applied, bad = make_one(src, n_round)
            if bad:
                rejected += 1
                continue
            if doc.text in seen:  # ซ้ำกับที่มีแล้ว ทิ้ง
                continue

            seen.add(doc.text)
            doc.meta["transforms"] = applied
            doc.meta["round"] = n_round
            for t in applied:
                stats[t] = stats.get(t, 0) + 1
            out.append(doc)
            added_this_round += 1

        stalls = stalls + 1 if added_this_round == 0 else 0

    if rejected:
        stats["_rejected_bad_offsets"] = rejected
    stats["_rounds"] = n_round
    return out[:target], stats


def augment_corpus(base: list[Doc], target: int, rng: random.Random) -> tuple[list[Doc], dict]:
    by_cat: dict[str, list[Doc]] = {}
    for d in base:
        by_cat.setdefault(d.meta.get("category", "UNKNOWN"), []).append(d)

    def make_one(src: Doc, _round: int):
        doc = Doc(src.text, [], {**src.meta, "augmented": True})
        applied: list[str] = []

        pool = by_cat.get(doc.meta.get("category", "UNKNOWN"), [])
        if len(pool) > 1 and rng.random() < 0.45:
            doc = aug_recombine(doc, rng.choice(pool), rng)
            applied.append("recombine")

        if rng.random() < 0.6:
            doc = aug_section_shuffle(doc, rng)
            applied.append("section_shuffle")
        if rng.random() < 0.5:
            doc = aug_sentence_dropout(doc, rng, p=0.2)
            applied.append("sentence_dropout")
        if rng.random() < 0.4:
            doc = aug_number_jitter(doc, rng)
            applied.append("number_jitter")
        if rng.random() < 0.35:
            doc = aug_ocr_noise(doc, rng)
            applied.append("ocr_noise")

        if not applied:  # อย่าปล่อยสำเนาเป๊ะ ๆ ออกไป
            doc = aug_section_shuffle(doc, rng)
            applied.append("section_shuffle")

        return doc, applied, False

    seed = [Doc(d.text, [], {**d.meta, "augmented": False, "transforms": []}) for d in base]
    return _run_loop(base, target, make_one, seed)


def augment_labeled(base: list[Doc], target: int, rng: random.Random) -> tuple[list[Doc], dict]:
    pools = build_pools(base)

    def make_one(src: Doc, _round: int):
        doc = Doc(src.text, list(src.entities), {**src.meta, "augmented": True})
        applied: list[str] = []

        if pools and rng.random() < 0.7:
            doc = aug_entity_swap(doc, pools, rng, p=0.4)
            applied.append("entity_swap")
        if rng.random() < 0.4:
            doc = aug_sentence_shuffle(doc, rng)
            applied.append("sentence_shuffle")
        if rng.random() < 0.3:
            doc = aug_sentence_dropout(doc, rng, p=0.2)
            applied.append("sentence_dropout")
        if rng.random() < 0.3:
            doc = aug_filler_insert(doc, rng)
            applied.append("filler_insert")
        if rng.random() < 0.35:
            doc = aug_ocr_noise(doc, rng)
            applied.append("ocr_noise")

        if not applied:
            doc = aug_entity_swap(doc, pools, rng, p=1.0) if pools else doc
            applied.append("entity_swap")

        # ขั้นตรวจ: offset ต้องยังชี้ถูก ไม่งั้นทิ้ง
        return doc, applied, bool(doc.validate())

    seed = [
        Doc(d.text, list(d.entities), {**d.meta, "augmented": False, "transforms": []})
        for d in base
    ]
    return _run_loop(base, target, make_one, seed)


# ===========================================================================
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["corpus", "labeled"], default="corpus")
    ap.add_argument("--target", type=int, default=10000)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--limit-base", type=int, help="จำกัดข้อมูลตั้งต้น (ไว้ลองก่อน)")
    ap.add_argument("--split", action="store_true", help="แบ่ง train/dev/test ให้ด้วย")
    args = ap.parse_args()

    rng = random.Random(args.seed)

    print(f"โหมด: {args.mode}  ·  เป้า: {args.target:,} ฉบับ  ·  seed: {args.seed}\n")
    base = load_corpus(args.limit_base) if args.mode == "corpus" else load_labeled()
    print(f"ข้อมูลตั้งต้น {len(base):,} ฉบับ")

    if len(base) >= args.target:
        print(f"  (มีมากกว่าเป้าอยู่แล้ว จะสุ่มเลือก {args.target:,} ฉบับ ไม่ต้อง augment)")
        rng.shuffle(base)
        docs, stats = base[: args.target], {}
    else:
        need = args.target - len(base)
        print(f"  ต้องสร้างเพิ่ม {need:,} ฉบับ (คูณประมาณ {args.target / len(base):.1f} เท่า)\n")
        docs, stats = (
            augment_corpus(base, args.target, rng)
            if args.mode == "corpus"
            else augment_labeled(base, args.target, rng)
        )

    # ---------- เขียนโฟลเดอร์ใหม่ ----------
    run_id = f"{args.mode}-{args.target}-seed{args.seed}-{datetime.now():%Y%m%d-%H%M%S}"
    out_dir = OUT_ROOT / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    def write(rows: list[Doc], path: Path) -> None:
        with path.open("w", encoding="utf-8") as fh:
            for d in rows:
                fh.write(json.dumps(d.to_json(), ensure_ascii=False) + "\n")

    write(docs, out_dir / "resumes.jsonl")

    if args.split:
        rng.shuffle(docs)
        n_tr, n_dev = int(len(docs) * 0.70), int(len(docs) * 0.15)
        write(docs[:n_tr], out_dir / "train.jsonl")
        write(docs[n_tr : n_tr + n_dev], out_dir / "dev.jsonl")
        write(docs[n_tr + n_dev :], out_dir / "test.jsonl")

    n_thai = sum(1 for d in docs if THAI_RE.search(d.text))
    n_ents = sum(len(d.entities) for d in docs)
    manifest = {
        "run_id": run_id,
        "created_at": datetime.now().isoformat(),
        "mode": args.mode,
        "seed": args.seed,
        "n_base": len(base),
        "n_output": len(docs),
        "multiplier": round(len(docs) / max(len(base), 1), 2),
        "n_entities": n_ents,
        "n_thai_docs": n_thai,
        "thai_pct": round(n_thai / max(len(docs), 1) * 100, 1),
        "transform_counts": stats,
        "split": bool(args.split),
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("=" * 62)
    if len(docs) < args.target:
        print(
            f"⚠  ได้ {len(docs):,} ฉบับ จากเป้า {args.target:,}\n"
            f"   สร้างของใหม่ที่ไม่ซ้ำไม่ได้แล้ว — ความหลากหลายตันที่ข้อมูลตั้งต้น {len(base):,} ฉบับ\n"
            f"   ทางแก้: เพิ่มข้อมูลตั้งต้น (ได้ผลที่สุด) หรือลดเป้าลง\n"
            f"   สคริปต์ยอมได้น้อยกว่าเป้า ดีกว่าปั๊มของซ้ำมาให้โมเดลเรียนเกินจริง\n"
        )
    print(f"เขียนแล้วที่: {out_dir}")
    print(f"  resumes.jsonl   {len(docs):,} ฉบับ (ไม่ซ้ำกันทุกฉบับ)")
    if args.split:
        print("  train/dev/test.jsonl  (70/15/15)")
    print("  manifest.json   สถิติและที่มา")
    transforms = {k: v for k, v in stats.items() if not k.startswith("_")}
    diagnostics = {k: v for k, v in stats.items() if k.startswith("_") and v}

    if transforms:
        print("\n  transform ที่ใช้:")
        for k, v in sorted(transforms.items(), key=lambda kv: -kv[1]):
            print(f"    {k:<28} {v:>7,}")
    if diagnostics:
        print("\n  หมายเหตุ:")
        for k, v in sorted(diagnostics.items()):
            print(f"    {k.lstrip('_'):<28} {v:>7,}")
    print("=" * 62)

    if args.mode == "labeled":
        print(f"\n  entity ทั้งหมด {n_ents:,} span")
        print("  ทุกฉบับผ่านการตรวจ offset แล้ว (ฉบับที่ span เพี้ยนถูกทิ้ง)")

    if manifest["thai_pct"] < 5:
        print(
            f"\n⚠  มีเรซูเม่ภาษาไทยแค่ {manifest['thai_pct']}%\n"
            "   ชุดนี้ใช้ทำ domain-adaptive pretraining (MLM) ได้\n"
            "   แต่ยัง fine-tune ให้อ่านเรซูเม่ไทยไม่ได้ ต้องมีข้อมูลไทยที่ label เอง"
        )


if __name__ == "__main__":
    main()
