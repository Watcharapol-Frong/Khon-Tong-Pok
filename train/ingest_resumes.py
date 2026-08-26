"""
รวมเรซูเม่จากทุกแหล่งใน data/raw/ ให้เป็น corpus เดียว

    python train/ingest_resumes.py                  # ทั้งหมด
    python train/ingest_resumes.py --limit 500      # ลองก่อน
    python train/ingest_resumes.py --workers 8

แหล่งข้อมูลที่รองรับ:
  - CSV ที่มีคอลัมน์ข้อความ (Resume.csv -> Resume_str)
  - PDF ทั้งโฟลเดอร์ (recursive) — ชื่อโฟลเดอร์แม่ใช้เป็น category
  - DOCX

ผลลัพธ์: data/corpus/resumes.jsonl  (cache — รันครั้งเดียวพอ)
ขั้นตอนนี้ช้าเพราะต้องแกะ PDF หมื่นกว่าไฟล์ เลยแยกออกจาก augment
ถ้ารันซ้ำจะข้ามไฟล์ที่ทำไปแล้ว
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from train.paths import CORPUS_DIR as OUT_DIR, CORPUS_FILE as OUT_FILE, RAW_DIR

THAI_RE = re.compile(r"[฀-๿]")
MIN_CHARS = 200  # สั้นกว่านี้แปลว่าแกะไม่ออก ไม่ใช่เรซูเม่จริง


# ---------------------------------------------------------------------------
def clean(text: str) -> str:
    """เก็บโครงย่อหน้าไว้ แต่บีบช่องว่างที่เกินมาจากการแกะ PDF"""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # ตัวคั่นบรรทัดแปลก ๆ ที่ PDF ชอบแถมมา (U+2028, U+2029, vertical tab, NEL)
    # json.dumps ไม่ escape พวกนี้ แต่ str.splitlines() ดันตัดบรรทัดตรงนั้นด้วย
    # ผลคือไฟล์ JSONL ที่เขียนไปแล้ว อ่านกลับไม่ได้ ("Unterminated string")
    # ต้องล้างตั้งแต่ตอนเขียน — มี regression test คุมไว้ที่ tests/test_augment.py
    text = re.sub("[\u000b\u000c\u001c\u001d\u001e\u0085\u2028\u2029]", "\n", text)
    text = re.sub("[ \t\u00a0\u200b]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def thai_ratio(text: str) -> float:
    if not text:
        return 0.0
    return len(THAI_RE.findall(text)) / len(text)


def make_id(source: str, key: str) -> str:
    return hashlib.sha1(f"{source}:{key}".encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
def read_pdf(path: Path, use_ocr: bool = False) -> tuple[str, bool]:
    """
    คืน (ข้อความ, ใช้ OCR หรือไม่)

    ค่าเริ่มต้นแกะแค่ text layer เพราะเร็ว แต่ชุด Resume_data_2 เกือบทั้งหมด
    เป็นภาพสแกนล้วน (0 ตัวอักษร) ต้องเปิด --ocr ถึงจะได้ข้อความออกมา
    """
    try:
        import fitz

        with fitz.open(path) as doc:
            text = clean("\n".join(page.get_text() for page in doc))
            if len(text) >= MIN_CHARS or not use_ocr:
                return text, False

            # ไม่มี text layer -> OCR ทีละหน้า
            import io

            import pytesseract
            from PIL import Image

            pages = []
            for page in doc:
                pix = page.get_pixmap(dpi=300)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                pages.append(pytesseract.image_to_string(img, lang="tha+eng"))
            return clean("\n".join(pages)), True

    except Exception:  # noqa: BLE001 — ไฟล์เสียมีปกติในชุดข้อมูลขนาดนี้ ข้ามไป
        return "", False


def _pdf_worker(args: tuple[str, str, bool]) -> dict | None:
    path_str, category, use_ocr = args
    path = Path(path_str)
    text, ocr_used = read_pdf(path, use_ocr)
    if len(text) < MIN_CHARS:
        return None
    return {
        "id": make_id("pdf", path.name),
        "source": "pdf_ocr" if ocr_used else "pdf",
        "source_path": str(path.relative_to(RAW_DIR)),
        "category": category,
        "text": text,
        "ocr_used": ocr_used,
        "thai_ratio": round(thai_ratio(text), 4),
        "n_chars": len(text),
    }


def ingest_pdfs(limit: int | None, workers: int, seen: set[str], use_ocr: bool = False) -> list[dict]:
    pdfs = sorted(RAW_DIR.rglob("*.pdf"))
    jobs: list[tuple[str, str, bool]] = []

    for path in pdfs:
        if make_id("pdf", path.name) in seen:
            continue
        # ชื่อโฟลเดอร์แม่มักเป็นชื่อสายอาชีพ เช่น .../Resumes PDF/Accountant/0.pdf
        category = path.parent.name.replace(" resumes", "").strip().upper()
        jobs.append((str(path), category, use_ocr))
        if limit and len(jobs) >= limit:
            break

    if not jobs:
        return []

    mode = "แกะ text layer + OCR" if use_ocr else "แกะ text layer"
    print(f"  {mode} {len(jobs)} ไฟล์ ด้วย {workers} process ...")
    if use_ocr:
        print(f"    (OCR ช้ามาก ~2-5 วิ/ไฟล์ — ประเมิน {len(jobs)*3/workers/60:.0f} นาที)")
    out: list[dict] = []
    failed = 0

    with ProcessPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_pdf_worker, j): j for j in jobs}
        for i, fut in enumerate(as_completed(futures), 1):
            rec = fut.result()
            if rec:
                out.append(rec)
            else:
                failed += 1
            if i % 500 == 0:
                print(f"    {i}/{len(jobs)} (ใช้ได้ {len(out)}, ข้าม {failed})")

    n_ocr = sum(1 for r in out if r.get("ocr_used"))
    tail = f" · ในนั้นมาจาก OCR {n_ocr}" if n_ocr else ""
    print(f"  PDF: ใช้ได้ {len(out)}{tail} · ข้าม {failed} (ภาพล้วนที่ยังไม่ OCR หรือไฟล์เสีย)")
    return out


# ---------------------------------------------------------------------------
def ingest_csvs(limit: int | None, seen: set[str]) -> list[dict]:
    out: list[dict] = []

    for path in sorted(RAW_DIR.rglob("*.csv")):
        with path.open(encoding="utf-8", errors="replace", newline="") as fh:
            reader = csv.DictReader(fh)
            if not reader.fieldnames:
                continue

            # เดาว่าคอลัมน์ไหนคือเนื้อเรซูเม่
            text_col = next(
                (
                    c
                    for c in reader.fieldnames
                    if c and re.search(r"resume_?str|text|content|body", c, re.I)
                ),
                None,
            )
            if not text_col:
                print(f"  ข้าม {path.name} — ไม่เจอคอลัมน์ข้อความ")
                continue

            cat_col = next(
                (c for c in reader.fieldnames if c and re.search(r"categ|label|job", c, re.I)),
                None,
            )
            id_col = next((c for c in reader.fieldnames if c and c.lower() == "id"), None)

            n = 0
            for row in reader:
                text = clean(row.get(text_col) or "")
                if len(text) < MIN_CHARS:
                    continue

                key = row.get(id_col) if id_col else f"{path.name}:{n}"
                rid = make_id("csv", str(key))
                if rid in seen:
                    continue

                out.append(
                    {
                        "id": rid,
                        "source": "csv",
                        "source_path": str(path.relative_to(RAW_DIR)),
                        "category": (row.get(cat_col) or "UNKNOWN").strip().upper()
                        if cat_col
                        else "UNKNOWN",
                        "text": text,
                        "thai_ratio": round(thai_ratio(text), 4),
                        "n_chars": len(text),
                    }
                )
                n += 1
                if limit and n >= limit:
                    break

            print(f"  {path.name}: {n} ฉบับ (คอลัมน์ '{text_col}')")

    return out


# ---------------------------------------------------------------------------
def ingest_docx(seen: set[str]) -> list[dict]:
    out: list[dict] = []
    paths = sorted(RAW_DIR.rglob("*.docx"))
    if not paths:
        return out

    try:
        import docx  # python-docx
    except ImportError:
        print(f"  ข้าม DOCX {len(paths)} ไฟล์ — ยังไม่ได้ติดตั้ง: pip install python-docx")
        return out

    for path in paths:
        rid = make_id("docx", path.name)
        if rid in seen:
            continue
        try:
            text = clean("\n".join(p.text for p in docx.Document(path).paragraphs))
        except Exception:  # noqa: BLE001
            continue
        if len(text) < MIN_CHARS:
            continue
        out.append(
            {
                "id": rid,
                "source": "docx",
                "source_path": str(path.relative_to(RAW_DIR)),
                "category": "UNKNOWN",
                "text": text,
                "thai_ratio": round(thai_ratio(text), 4),
                "n_chars": len(text),
            }
        )

    print(f"  DOCX: {len(out)} ฉบับ")
    return out


# ---------------------------------------------------------------------------
def load_existing() -> tuple[list[dict], set[str]]:
    if not OUT_FILE.exists():
        return [], set()
    with OUT_FILE.open(encoding="utf-8") as fh:
        rows = [json.loads(line) for line in fh if line.strip()]
    print(f"เจอ cache เดิม {len(rows)} ฉบับ — จะเพิ่มเฉพาะไฟล์ใหม่")
    return rows, {r["id"] for r in rows}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="จำกัดจำนวนต่อแหล่ง (ไว้ลองก่อน)")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--rebuild", action="store_true", help="ไม่สนใจ cache เดิม")
    ap.add_argument("--ocr", action="store_true",
                    help="OCR ไฟล์ที่เป็นภาพสแกน (Resume_data_2 ~8,900 ไฟล์) — ช้ามากแต่ได้ข้อมูลเพิ่มเท่าตัว")
    args = ap.parse_args()

    if not RAW_DIR.exists():
        raise SystemExit(f"ไม่พบ {RAW_DIR}")

    rows, seen = ([], set()) if args.rebuild else load_existing()

    print("\nอ่าน CSV:")
    rows += ingest_csvs(args.limit, seen)
    seen = {r["id"] for r in rows}

    print("\nอ่าน DOCX:")
    rows += ingest_docx(seen)
    seen = {r["id"] for r in rows}

    print("\nอ่าน PDF:")
    rows += ingest_pdfs(args.limit, args.workers, seen, use_ocr=args.ocr)

    # กันเรซูเม่ซ้ำที่มาจากทั้ง CSV และ PDF ของชุดเดียวกัน
    by_text: dict[str, dict] = {}
    for r in rows:
        fingerprint = hashlib.sha1(re.sub(r"\s+", "", r["text"][:2000]).encode()).hexdigest()
        by_text.setdefault(fingerprint, r)
    deduped = list(by_text.values())
    n_dupes = len(rows) - len(deduped)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open("w", encoding="utf-8") as fh:
        for r in deduped:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    thai = sum(1 for r in deduped if r["thai_ratio"] > 0.1)
    cats = len({r["category"] for r in deduped})

    print("\n" + "=" * 62)
    print(f"corpus พร้อมแล้ว: {OUT_FILE}")
    print(f"  ทั้งหมด          {len(deduped):>6} ฉบับ  (ตัดซ้ำออก {n_dupes})")
    print(f"  สายอาชีพ         {cats:>6} หมวด")
    print(f"  เฉลี่ย           {sum(r['n_chars'] for r in deduped) // max(len(deduped), 1):>6} ตัวอักษร")
    print(f"  ภาษาไทย          {thai:>6} ฉบับ")
    print("=" * 62)

    if thai == 0:
        print(
            "\n⚠  ไม่มีเรซูเม่ภาษาไทยเลยสักฉบับ\n"
            "   corpus นี้ใช้ทำ domain-adaptive pretraining ได้ (โมเดลจะคุ้นกับ\n"
            "   'ภาษาแบบเรซูเม่' เช่นหัวข้อ Experience/Skills และรูปแบบ bullet)\n"
            "   แต่ **เอาไป fine-tune ให้สกัดทักษะจากเรซูเม่ไทยตรง ๆ ไม่ได้**\n"
            "   ยังต้องเก็บเรซูเม่ไทยจริงจากเพื่อน ๆ แล้ว label เองอยู่ดี\n"
            "   ดู train/labeling_guide.md"
        )

    print(f"\nขั้นต่อไป: python train/augment_resumes.py --target 10000")


if __name__ == "__main__":
    main()
