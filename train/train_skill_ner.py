"""
Fine-tune WangchanBERTa สำหรับสกัดทักษะจากเรซูเม่ไทย

รันบน Colab T4 ฟรี ใช้เวลา ~20 นาทีกับข้อมูล 800 ประโยค
คอขวดไม่ใช่การเทรน แต่คือการ label — ดู train/labeling_guide.md

    # เทียบสองโมเดลด้วยข้อมูลชุดเดียวกัน (ทำสไลด์ "เราเลือกด้วยข้อมูล")
    python train/train_skill_ner.py --base airesearch/wangchanberta-base-att-spm-uncased
    python train/train_skill_ner.py --base clicknext/phayathaibert --out models/skill-ner-phaya

ทำไมต้องเทียบ PhayaThaiBERT:
เรซูเม่ไทยเต็มไปด้วยคำทับศัพท์ที่ไม่ถูกกลืน ("ทำ presentation", "ดูแล stock",
"เขียน unit test") ซึ่ง SPM tokenizer ของ WangchanBERTa แตกคำพวกนี้ได้ไม่ดีนัก
PhayaThaiBERT ถูกสร้างมาแก้ปัญหานี้โดยเฉพาะ — ผลจะออกทางไหนก็ได้สไลด์ทั้งคู่
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from datasets import Dataset
from seqeval.metrics import classification_report, f1_score, precision_score, recall_score
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

LABELS = ["O", "B-SKILL", "I-SKILL", "B-KNOW", "I-KNOW"]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = dict(enumerate(LABELS))

MAX_LEN = 416


# ---------------------------------------------------------------------------
def load_jsonl(path: Path) -> list[dict]:
    """
    รับไฟล์ที่ export จาก Label Studio (หรือเขียนมือ) หน้าตาแบบนี้:

        {"text": "ผมเขียน Python ดูแล stock ให้ร้าน",
         "entities": [{"start": 7, "end": 13, "label": "KNOW"},
                      {"start": 14, "end": 24, "label": "SKILL"}]}
    """
    rows = []
    with path.open(encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise SystemExit(f"{path}:{line_no} อ่าน JSON ไม่ได้ — {exc}") from exc
    if not rows:
        raise SystemExit(f"{path} ว่างเปล่า — ยังไม่มีข้อมูล label")
    return rows


# ---------------------------------------------------------------------------
def encode(rows: list[dict], tokenizer) -> Dataset:
    """
    แปลง entity ที่เป็นช่วงตัวอักษร -> ป้าย BIO ระดับ token

    จุดที่พลาดกันบ่อย: subword token ตัวที่ 2 เป็นต้นไปของคำเดียวกัน
    ต้องได้ I- ไม่ใช่ B- ไม่งั้น seqeval จะนับ span แตกเป็นหลายอัน แล้ว F1 ตกฟรี ๆ
    """
    encoded = {"input_ids": [], "attention_mask": [], "labels": []}

    for row in rows:
        text: str = row["text"]
        ents = sorted(row.get("entities", []), key=lambda e: e["start"])

        enc = tokenizer(
            text,
            return_offsets_mapping=True,
            truncation=True,
            max_length=MAX_LEN,
        )
        offsets = enc["offset_mapping"]
        labels = []

        for start, end in offsets:
            if start == end:  # special token
                labels.append(-100)
                continue

            tag = "O"
            for ent in ents:
                if start >= ent["end"] or end <= ent["start"]:
                    continue
                prefix = "B" if start <= ent["start"] else "I"
                tag = f"{prefix}-{ent['label']}"
                break
            labels.append(LABEL2ID[tag])

        encoded["input_ids"].append(enc["input_ids"])
        encoded["attention_mask"].append(enc["attention_mask"])
        encoded["labels"].append(labels)

    return Dataset.from_dict(encoded)


# ---------------------------------------------------------------------------
def build_metrics():
    def compute(eval_pred):
        logits, gold = eval_pred
        pred = np.argmax(logits, axis=-1)

        true_seq, pred_seq = [], []
        for p_row, g_row in zip(pred, gold, strict=False):
            t, pr = [], []
            for p_i, g_i in zip(p_row, g_row, strict=False):
                if g_i == -100:
                    continue
                t.append(ID2LABEL[int(g_i)])
                pr.append(ID2LABEL[int(p_i)])
            true_seq.append(t)
            pred_seq.append(pr)

        return {
            "precision": precision_score(true_seq, pred_seq),
            "recall": recall_score(true_seq, pred_seq),
            "f1": f1_score(true_seq, pred_seq),
            "report": classification_report(true_seq, pred_seq, digits=3),
        }

    return compute


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="airesearch/wangchanberta-base-att-spm-uncased")
    ap.add_argument("--train", default="data/labeled/train.jsonl")
    ap.add_argument("--dev", default="data/labeled/dev.jsonl")
    ap.add_argument("--test", default="data/labeled/test.jsonl")
    ap.add_argument("--out", default="models/skill-ner-v1")
    ap.add_argument("--epochs", type=int, default=5)
    ap.add_argument("--lr", type=float, default=3e-5)
    ap.add_argument("--batch", type=int, default=16)
    args = ap.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.base)
    if not tokenizer.is_fast:
        raise SystemExit(
            f"{args.base} ไม่มี fast tokenizer — ต้องใช้ offset_mapping ในการ align ป้าย"
        )

    train_ds = encode(load_jsonl(Path(args.train)), tokenizer)
    dev_ds = encode(load_jsonl(Path(args.dev)), tokenizer)

    print(f"train={len(train_ds)} dev={len(dev_ds)} base={args.base}")
    if len(train_ds) < 300:
        print(
            "\n⚠  ข้อมูลน้อยกว่า 300 ประโยค — F1 จะยังไม่น่าเชื่อถือพอขึ้นสไลด์\n"
            "   เป้าคือ 800 ประโยค ดู train/labeling_guide.md\n"
        )

    model = AutoModelForTokenClassification.from_pretrained(
        args.base,
        num_labels=len(LABELS),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=f"{args.out}-ckpt",
            learning_rate=args.lr,
            per_device_train_batch_size=args.batch,
            per_device_eval_batch_size=args.batch,
            num_train_epochs=args.epochs,
            weight_decay=0.01,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            logging_steps=20,
            report_to=[],
        ),
        train_dataset=train_ds,
        eval_dataset=dev_ds,
        data_collator=DataCollatorForTokenClassification(tokenizer),
        compute_metrics=build_metrics(),
    )

    trainer.train()

    # ---- วัดผลบน test set: ตัวเลขชุดนี้เท่านั้นที่เอาขึ้นสไลด์ได้ ----
    test_path = Path(args.test)
    if test_path.exists():
        test_ds = encode(load_jsonl(test_path), tokenizer)
        result = trainer.evaluate(test_ds, metric_key_prefix="test")
        print("\n" + "=" * 60)
        print("ผลบน TEST SET — ตัวเลขนี้คือตัวที่เอาขึ้นสไลด์ได้")
        print("=" * 60)
        print(f"  Precision : {result['test_precision']:.3f}")
        print(f"  Recall    : {result['test_recall']:.3f}")
        print(f"  F1        : {result['test_f1']:.3f}")
        print(f"  n_test    : {len(test_ds)}")
        print("\n" + result["test_report"])

        Path(args.out).mkdir(parents=True, exist_ok=True)
        (Path(args.out) / "metrics.json").write_text(
            json.dumps(
                {
                    "base_model": args.base,
                    "precision": result["test_precision"],
                    "recall": result["test_recall"],
                    "f1": result["test_f1"],
                    "n_train": len(train_ds),
                    "n_test": len(test_ds),
                    "epochs": args.epochs,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    trainer.save_model(args.out)
    tokenizer.save_pretrained(args.out)
    print(f"\n✓ บันทึกโมเดลไว้ที่ {args.out}")
    print(f"  ตั้ง SKILL_MODEL_PATH={args.out} ใน .env แล้วรีสตาร์ท API")


if __name__ == "__main__":
    main()
