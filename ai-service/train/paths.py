"""
ที่อยู่ของข้อมูลทุกชุด — รวมไว้ที่เดียว

ข้อมูลดิบอยู่ที่ generation_hack/data/ (นอก ai-service) เพราะมันใหญ่มาก
และใช้ร่วมกันทั้งทีม ส่วนสคริปต์รันจาก ai-service/ เลยต้องมองขึ้นไปข้างบน
ทุกสคริปต์ import จากไฟล์นี้ จะได้ไม่มีใครเดา path เองแล้วชี้คนละที่
"""

from __future__ import annotations

from pathlib import Path


def _find_data_root() -> Path:
    """ไล่หาโฟลเดอร์ data/ ที่มี raw/ อยู่ข้างใน ขึ้นไปทีละชั้น"""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "data"
        if (candidate / "raw").exists():
            return candidate
    # ยังไม่มีข้อมูล — ใช้ระดับเดียวกับ ai-service เป็นค่าเริ่มต้น
    return here.parent.parent.parent / "data"


DATA_ROOT = _find_data_root()

RAW_DIR = DATA_ROOT / "raw"
CORPUS_DIR = DATA_ROOT / "corpus"
LABELED_DIR = DATA_ROOT / "labeled"
AUGMENTED_DIR = DATA_ROOT / "augmented"

CORPUS_FILE = CORPUS_DIR / "resumes.jsonl"


if __name__ == "__main__":
    print(f"DATA_ROOT  {DATA_ROOT}")
    for name, path in [
        ("raw", RAW_DIR),
        ("corpus", CORPUS_DIR),
        ("labeled", LABELED_DIR),
        ("augmented", AUGMENTED_DIR),
    ]:
        mark = "มี" if path.exists() else "ยังไม่มี"
        print(f"  {name:<10} {path}  [{mark}]")
