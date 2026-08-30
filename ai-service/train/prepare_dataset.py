"""
รวมไฟล์ที่แต่ละคน label มา -> ตรวจความถูกต้อง -> แบ่ง train/dev/test

    python train/prepare_dataset.py

ทำไมต้องมีขั้นตรวจ: offset ที่คลาดไปตัวเดียวจะทำให้โมเดลเรียนป้ายผิดแบบเงียบ ๆ
เทรนเสร็จแล้ว F1 ต่ำโดยไม่รู้สาเหตุ — ตรวจตรงนี้ถูกกว่าเทรนใหม่เยอะ
"""

from __future__ import annotations

import json
import random
from collections import Counter
from pathlib import Path

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from train.paths import LABELED_DIR

VALID_LABELS = {"SKILL", "KNOW"}

# คำโม้ที่กติกาข้อ 3 ห้าม label — เจอแล้วเตือน (ไม่ลบให้ ต้องให้คนตัดสินใจ)
HYPE_WORDS = [
    "เรียนรู้เร็ว",
    "ทำงานเป็นทีมได้ดี",
    "มีความรับผิดชอบ",
    "ตั้งใจทำงาน",
    "ขยัน",
    "อดทน",
    "มนุษยสัมพันธ์ดี",
    "ละเอียดรอบคอบ",
]


def load_all(src_dir: Path) -> list[dict]:
    rows: list[dict] = []
    files = sorted(p for p in src_dir.glob("*.jsonl") if p.stem not in {"train", "dev", "test"})

    if not files:
        raise SystemExit(
            f"ไม่พบไฟล์ .jsonl ใน {src_dir}\n"
            "ให้แต่ละคนวางไฟล์ที่ label เสร็จไว้ที่นี่ เช่น data/labeled/french.jsonl"
        )

    for path in files:
        n_before = len(rows)
        with path.open(encoding="utf-8") as fh:
            for line_no, line in enumerate(fh, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError as exc:
                    raise SystemExit(f"{path.name}:{line_no} JSON เสีย — {exc}") from exc
        print(f"  {path.name:<28} {len(rows) - n_before:>4} ประโยค")

    return rows


def validate(rows: list[dict]) -> tuple[list[dict], list[str]]:
    """คืน (แถวที่ผ่าน, รายการปัญหา)"""
    clean: list[dict] = []
    problems: list[str] = []
    seen: set[str] = set()

    for i, row in enumerate(rows):
        text = row.get("text", "")
        if not text.strip():
            problems.append(f"[{i}] ข้อความว่าง")
            continue

        if text in seen:
            problems.append(f"[{i}] ซ้ำกับประโยคก่อนหน้า — ตัดออก: {text[:40]}...")
            continue
        seen.add(text)

        ok = True
        for ent in row.get("entities", []):
            start, end = ent.get("start"), ent.get("end")
            label = ent.get("label")

            if label not in VALID_LABELS:
                problems.append(f"[{i}] ป้าย '{label}' ไม่ถูกต้อง (ต้องเป็น SKILL หรือ KNOW)")
                ok = False
                continue

            if start is None or end is None or start >= end:
                problems.append(f"[{i}] ช่วง ({start},{end}) ไม่ถูกต้อง")
                ok = False
                continue

            if end > len(text):
                problems.append(
                    f"[{i}] end={end} เกินความยาวข้อความ ({len(text)}) — offset เพี้ยน"
                )
                ok = False
                continue

            surface = text[start:end]
            if surface != surface.strip():
                problems.append(
                    f"[{i}] '{surface}' มีช่องว่างหัว/ท้าย — ขยับ offset ให้ชิดคำ"
                )

            for hype in HYPE_WORDS:
                if hype in surface:
                    problems.append(
                        f"[{i}] ⚠ label คำโม้ '{surface}' — ผิดกติกาข้อ 3 ให้เอาออก"
                    )

        if ok:
            clean.append(row)

    return clean, problems


def split(rows: list[dict], seed: int = 42) -> dict[str, list[dict]]:
    random.Random(seed).shuffle(rows)
    n = len(rows)
    n_train = int(n * 0.70)
    n_dev = int(n * 0.15)
    return {
        "train": rows[:n_train],
        "dev": rows[n_train : n_train + n_dev],
        "test": rows[n_train + n_dev :],
    }


def write(rows: list[dict], path: Path) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    src = LABELED_DIR
    src.mkdir(parents=True, exist_ok=True)

    print("อ่านไฟล์ที่ label มา:")
    rows = load_all(src)

    print(f"\nรวมทั้งหมด {len(rows)} ประโยค — กำลังตรวจ...")
    clean, problems = validate(rows)

    if problems:
        print(f"\n⚠ พบ {len(problems)} จุดที่ต้องดู:")
        for p in problems[:40]:
            print("   " + p)
        if len(problems) > 40:
            print(f"   ... และอีก {len(problems) - 40} จุด")

    label_count = Counter(
        ent["label"] for row in clean for ent in row.get("entities", [])
    )
    no_entity = sum(1 for r in clean if not r.get("entities"))

    print(f"\nผ่านการตรวจ {len(clean)} ประโยค")
    print(f"  SKILL : {label_count.get('SKILL', 0)}")
    print(f"  KNOW  : {label_count.get('KNOW', 0)}")
    print(f"  ประโยคที่ไม่มีทักษะเลย : {no_entity} ({no_entity / max(len(clean), 1):.0%})")

    if no_entity / max(len(clean), 1) < 0.15:
        print(
            "\n  ⚠ ประโยคเปล่ามีน้อยไป — โมเดลจะเดาว่าทุกอย่างคือทักษะ\n"
            "     ควรมีประโยคที่ไม่มีทักษะสัก 20-30% (เช่น ประโยคคำโม้ล้วน)"
        )

    parts = split(clean)
    for name, subset in parts.items():
        out = src / f"{name}.jsonl"
        write(subset, out)
        print(f"  เขียน {out} ({len(subset)} ประโยค)")

    if len(clean) < 300:
        print(
            f"\n⚠ ตอนนี้มี {len(clean)} ประโยค — เป้าคือ 800\n"
            "  เทรนตอนนี้ได้ แต่ F1 จะยังไม่น่าเชื่อถือพอเอาขึ้นสไลด์"
        )
    else:
        print("\n✓ พร้อมเทรนแล้ว: python train/train_skill_ner.py")


if __name__ == "__main__":
    main()
