"""
เขียน label ด้วยวงเล็บเหลี่ยม แล้วแปลงเป็น JSONL ให้อัตโนมัติ

    python train/markup_to_jsonl.py data/labeled/french.md

เขียนแบบนี้ทีละบรรทัด (ง่ายกว่านั่งนับตัวอักษรเอง ซึ่งพลาดง่ายมาก):

    ผมเขียน [Python|KNOW] และ [ดูแล stock|SKILL] ให้ร้านพ่อ
    เป็นประธานชมรม [จัดค่าย 3 วันให้น้อง 80 คน|SKILL]
    มีความตั้งใจสูงและพร้อมเรียนรู้

บรรทัดที่ขึ้นต้นด้วย # คือคอมเมนต์ บรรทัดว่างข้าม
บรรทัดที่ไม่มีวงเล็บเลย = ประโยคที่ไม่มีทักษะ (ต้องมีด้วย ~20-30% ดูกติกาข้อ 3)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MARKUP = re.compile(r"\[([^\[\]|]+)\|(SKILL|KNOW)\]")


def parse_line(line: str) -> dict:
    """แกะ markup ออก แล้วคำนวณ offset ของข้อความสุดท้าย"""
    text_parts: list[str] = []
    entities: list[dict] = []
    pos = 0
    cursor = 0

    for m in MARKUP.finditer(line):
        before = line[cursor : m.start()]
        text_parts.append(before)
        pos += len(before)

        surface = m.group(1)
        entities.append({"start": pos, "end": pos + len(surface), "label": m.group(2)})
        text_parts.append(surface)
        pos += len(surface)
        cursor = m.end()

    text_parts.append(line[cursor:])
    return {"text": "".join(text_parts), "entities": entities}


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    src = Path(sys.argv[1])
    dst = src.with_suffix(".jsonl")

    rows, n_ent = [], 0
    for raw in src.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        row = parse_line(line)

        # ตรวจทันทีว่า offset ที่คำนวณชี้ถูกจริง
        for e in row["entities"]:
            surface = row["text"][e["start"] : e["end"]]
            if surface != surface.strip():
                print(f"  ⚠ '{surface}' มีช่องว่างหัวท้าย — ขยับวงเล็บให้ชิดคำ")

        rows.append(row)
        n_ent += len(row["entities"])

    with dst.open("w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    empty = sum(1 for r in rows if not r["entities"])
    print(f"เขียน {dst}")
    print(f"  {len(rows)} ประโยค · {n_ent} span · ประโยคเปล่า {empty} ({empty/max(len(rows),1):.0%})")


if __name__ == "__main__":
    main()
