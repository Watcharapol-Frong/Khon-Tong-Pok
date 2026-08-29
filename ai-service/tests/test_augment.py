"""
เทสต์ว่า augmentation ไม่ทำ offset เพี้ยน

นี่คือ bug ที่อันตรายที่สุดของงาน NER: ถ้า span ขยับผิดตำแหน่ง โมเดลจะเรียนป้ายมั่ว
แบบเงียบ ๆ ไม่มี error ไม่มี warning เทรนเสร็จแล้ว F1 ต่ำโดยหาสาเหตุไม่เจอ
เทสต์พวกนี้เลยตรวจแบบอิสระจาก validate() ที่อยู่ในตัวสคริปต์
"""

import random

import pytest

from train.augment_resumes import (
    Doc,
    Entity,
    aug_entity_swap,
    aug_filler_insert,
    aug_number_jitter,
    aug_ocr_noise,
    aug_sentence_dropout,
    aug_sentence_shuffle,
    augment_labeled,
    build_pools,
    from_segments,
    to_segments,
)


def make_doc() -> Doc:
    text = "ผมเขียน Python ดูแล stock ให้ร้านพ่อ\nและใช้ Figma ออกแบบ user flow ของแอป"
    return Doc(
        text,
        [
            Entity(text.index("Python"), text.index("Python") + len("Python"), "KNOW"),
            Entity(text.index("ดูแล stock"), text.index("ดูแล stock") + len("ดูแล stock"), "SKILL"),
            Entity(text.index("Figma"), text.index("Figma") + len("Figma"), "KNOW"),
            Entity(
                text.index("ออกแบบ user flow"),
                text.index("ออกแบบ user flow") + len("ออกแบบ user flow"),
                "SKILL",
            ),
        ],
    )


def surfaces(doc: Doc) -> list[str]:
    """ดึงข้อความที่ offset ชี้ไปจริง ๆ — ไม่ใช่ค่าที่จำไว้"""
    return [doc.text[e.start : e.end] for e in sorted(doc.entities, key=lambda e: e.start)]


def assert_offsets_sane(doc: Doc) -> None:
    for e in doc.entities:
        assert 0 <= e.start < e.end <= len(doc.text), f"({e.start},{e.end}) หลุดขอบ"
        s = doc.text[e.start : e.end]
        assert s, "span ชี้ไปที่ข้อความว่าง"
        assert s == s.strip(), f"'{s}' มีช่องว่างหัวท้าย"


# ---------------------------------------------------------------------------
def test_segments_round_trip():
    """แตกแล้วประกอบกลับต้องได้ของเดิมเป๊ะ — ถ้าอันนี้พัง ทุก transform พังหมด"""
    doc = make_doc()
    rebuilt = from_segments(to_segments(doc))

    assert rebuilt.text == doc.text
    assert surfaces(rebuilt) == surfaces(doc)
    assert [e.label for e in rebuilt.entities] == [e.label for e in doc.entities]


def test_ocr_noise_keeps_length_so_offsets_never_move():
    """OCR noise แทนที่ทีละตัว ความยาวต้องเท่าเดิม offset จึงไม่ต้องขยับ"""
    doc = make_doc()
    out = aug_ocr_noise(doc, random.Random(1), rate=0.9)

    assert len(out.text) == len(doc.text)
    assert [(e.start, e.end) for e in out.entities] == [(e.start, e.end) for e in doc.entities]
    assert out.text != doc.text, "rate=0.9 แล้วยังไม่เปลี่ยนอะไรเลย แปลว่าตารางไม่ทำงาน"
    assert_offsets_sane(out)


def test_entity_swap_uses_pool_and_remaps_offsets():
    doc = make_doc()
    pools = {"KNOW": ["Java", "Excel", "Figma", "Python"], "SKILL": ["จัดตารางเวร", "ดูแล stock", "ออกแบบ user flow"]}

    swapped_at_least_once = False
    for seed in range(30):
        out = aug_entity_swap(doc, pools, random.Random(seed), p=1.0)
        assert_offsets_sane(out)
        assert len(out.entities) == len(doc.entities)

        for ent, surf in zip(sorted(out.entities, key=lambda e: e.start), surfaces(out), strict=True):
            # ข้อความที่ offset ชี้ไป ต้องเป็นสมาชิกของ pool ป้ายนั้นเสมอ
            assert surf in pools[ent.label], f"'{surf}' ไม่ได้อยู่ใน pool ของ {ent.label}"

        if surfaces(out) != surfaces(doc):
            swapped_at_least_once = True

    assert swapped_at_least_once, "p=1.0 แล้วไม่เคยสลับเลยสักครั้ง"


def test_sentence_shuffle_keeps_every_entity():
    """สลับประโยคแล้ว entity ต้องครบเท่าเดิม แค่เรียงใหม่"""
    doc = make_doc()
    for seed in range(20):
        out = aug_sentence_shuffle(doc, random.Random(seed))
        assert_offsets_sane(out)
        assert sorted(surfaces(out)) == sorted(surfaces(doc))


def test_sentence_dropout_never_drops_a_sentence_with_entities():
    doc = make_doc()
    for seed in range(20):
        out = aug_sentence_dropout(doc, random.Random(seed), p=1.0)
        assert_offsets_sane(out)
        # p=1.0 ตัดทุกประโยคที่ไม่มี entity แต่ประโยคที่มีต้องอยู่ครบ
        assert sorted(surfaces(out)) == sorted(surfaces(doc))


@pytest.mark.parametrize("transform", [aug_filler_insert, aug_number_jitter])
def test_length_changing_transforms_keep_surfaces_intact(transform):
    """transform ที่แก้ข้อความนอก entity ต้องไม่ทำให้ span ชี้ผิด"""
    doc = make_doc()
    for seed in range(20):
        out = transform(doc, random.Random(seed))
        assert_offsets_sane(out)
        assert sorted(surfaces(out)) == sorted(surfaces(doc))


def test_build_pools_reads_offsets_not_cached_text():
    doc = make_doc()
    pools = build_pools([doc])
    assert "Python" in pools["KNOW"]
    assert "ดูแล stock" in pools["SKILL"]


# ---------------------------------------------------------------------------
def test_end_to_end_every_output_doc_has_valid_offsets():
    """
    ตัวสำคัญที่สุด: รัน pipeline เต็มแล้วตรวจผลลัพธ์ทุกฉบับแบบอิสระ
    ไม่เชื่อ validate() ที่อยู่ในสคริปต์
    """
    base = [make_doc() for _ in range(5)]
    for i, d in enumerate(base):
        d.meta["parent_id"] = f"seed:{i}"

    docs, stats = augment_labeled(base, target=300, rng=random.Random(7))

    assert stats.get("_rejected_bad_offsets", 0) == 0

    for doc in docs:
        assert_offsets_sane(doc)
        assert doc.entities, "ฉบับที่ไม่เหลือ entity เลยไม่ควรหลุดออกมา"
        for ent in doc.entities:
            assert ent.label in ("SKILL", "KNOW")


def test_output_is_always_deduplicated():
    """
    ห้ามมีข้อความซ้ำหลุดออกไปเด็ดขาด
    ของซ้ำไม่ได้เพิ่มข้อมูล แต่ทำให้โมเดลเห็นตัวอย่างนั้นบ่อยเกินจริง = overfit
    """
    base = [make_doc() for _ in range(5)]
    docs, _ = augment_labeled(base, target=300, rng=random.Random(7))

    texts = [d.text for d in docs]
    assert len(texts) == len(set(texts)), "มีข้อความซ้ำหลุดออกมา"


def test_stops_gracefully_when_diversity_runs_out():
    """
    base เล็กมาก + pool เล็ก = สร้างของใหม่ได้จำกัด
    ต้องหยุดเองแล้วคืนเท่าที่ได้ ไม่ใช่วนไม่จบหรือปั๊มของซ้ำจนครบเป้า
    """
    base = [make_doc()]
    docs, stats = augment_labeled(base, target=100_000, rng=random.Random(1))

    assert len(docs) < 100_000, "ควรยอมแพ้ ไม่ใช่ปั๊มของซ้ำจนครบ"
    assert len({d.text for d in docs}) == len(docs)
    assert stats["_rounds"] < 10_000


def test_output_json_round_trips():
    docs, _ = augment_labeled([make_doc()], target=20, rng=random.Random(3))
    for doc in docs:
        row = doc.to_json()
        for e in row["entities"]:
            surf = row["text"][e["start"] : e["end"]]
            assert surf == surf.strip() and surf


# ---------------------------------------------------------------------------
SEPARATORS = "\u000b\u000c\u001c\u001d\u001e\u0085\u2028\u2029"


def test_jsonl_survives_weird_pdf_line_separators():
    """
    Regression: ข้อความจาก PDF มี U+2028 / U+2029 / vertical tab / NEL ปนมาได้

    json.dumps ไม่ escape ตัวพวกนี้ (มันถูกต้องตามสเปก JSON) แต่ str.splitlines()
    ดันนับมันเป็นตัวขึ้นบรรทัดใหม่ -> ไฟล์ JSONL ที่เขียนไปแล้วอ่านกลับไม่ได้
    พังแบบ "Unterminated string" ตอนโหลด corpus

    ทางแก้มีสองชั้น: clean() ล้างตั้งแต่ตอนเขียน และคนอ่านวนไฟล์ทีละบรรทัดจริง ๆ
    """
    import json

    from train.ingest_resumes import clean

    nasty = "บรรทัดหนึ่ง" + SEPARATORS.join(["สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"])
    cleaned = clean(nasty)

    for ch in SEPARATORS:
        assert ch not in cleaned, f"clean() ยังไม่ได้ล้าง U+{ord(ch):04X} ออก"

    line = json.dumps({"text": cleaned}, ensure_ascii=False)
    assert len(line.splitlines()) == 1, "JSONL หนึ่งเรคอร์ดต้องอยู่บรรทัดเดียว"
    assert json.loads(line)["text"] == cleaned


def test_corpus_reader_does_not_use_splitlines(tmp_path):
    """
    ต่อให้ clean() พลาด คนอ่านก็ต้องไม่พังอยู่ดี
    วนไฟล์ทีละบรรทัดจะตัดที่ \n อย่างเดียว ต่างจาก splitlines()
    """
    import json

    payload = {"text": "ก" + "\u2028" + "ข", "entities": []}
    f = tmp_path / "x.jsonl"
    f.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")

    # แบบที่พัง
    assert len(f.read_text(encoding="utf-8").splitlines()) == 2

    # แบบที่ถูก
    with f.open(encoding="utf-8") as fh:
        rows = [json.loads(ln) for ln in fh if ln.strip()]
    assert len(rows) == 1
    assert rows[0]["text"] == payload["text"]
