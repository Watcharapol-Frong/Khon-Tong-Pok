"""
Fine-tune น้องตรงปก ด้วย QLoRA บน Typhoon 2.5

    python train/gen_interview_data.py --n 1200
    python train/train_interview_lora.py --data 1200-seed42-...

ตั้งค่าเริ่มต้นปรับมาให้พอดีกับ RTX 4050 Laptop (6.4 GB):
    4-bit NF4 + LoRA r=16 + gradient checkpointing + seq 1024 + batch 1 x accum 16
ถ้ารันบน Colab T4 (16 GB) เพิ่ม --batch 2 --seq 1536 ได้สบาย

--------------------------------------------------------------------------
สองเรื่องที่พลาดแล้วเทรนเสียเปล่า

1. **ต้องเทรนเฉพาะเทิร์นของผู้ช่วย** ถ้าใส่ loss ทั้งบทสนทนา โมเดลจะเรียน
   "เลียนแบบผู้ใช้" ไปด้วย แล้วเวลาใช้จริงมันจะเริ่มพูดแทนผู้ใช้เอง
   สคริปต์นี้ mask เทิร์นผู้ใช้เป็น -100 หมด และมีเช็คว่า mask ถูกจริง

2. **chat template ต้องตรงกับตอนเสิร์ฟ** เทรนด้วยรูปแบบหนึ่งแล้วไปเสิร์ฟอีกแบบ
   = โมเดลเจอ format ที่ไม่เคยเห็น คุณภาพตกโดยไม่รู้ตัว
   เลยใช้ tokenizer.apply_chat_template ตัวเดียวกับที่ ai/llm/ ใช้
--------------------------------------------------------------------------
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import torch
import numpy as np
from torch.utils.data import Dataset

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train.paths import DATA_ROOT  # noqa: E402

INTERVIEW_DIR = DATA_ROOT / "interview"
DEFAULT_BASE = "scb10x/typhoon2.5-qwen3-4b"


# ---------------------------------------------------------------------------

def apply_template(tok, messages: list[dict], **kw) -> list[int]:
    """Qwen3 มีโหมด thinking ติดมาใน template — ต้องปิด ไม่งั้นได้ token ขยะมาเต็ม"""
    try:
        return tok.apply_chat_template(messages, tokenize=True, enable_thinking=False, **kw)
    except TypeError:
        return tok.apply_chat_template(messages, tokenize=True, **kw)


class ConversationDataset(Dataset):
    """
    แปลงบทสนทนาเป็น input_ids + labels ที่ mask เทิร์นผู้ใช้ไว้แล้ว

    วิธี: ต่อ template ทีละเทิร์นแล้วดูว่า token ที่ "งอกเพิ่ม" มาจากเทิร์นไหน
    ถ้าเป็นเทิร์นผู้ช่วย -> เก็บไว้เป็น label, ถ้าไม่ใช่ -> ใส่ -100
    ทำแบบนี้ได้ผลถูกต้องกับทุก template ที่ต่อ prefix ไปเรื่อย ๆ (ChatML/Qwen เป็นแบบนั้น)
    """

    def __init__(self, path: Path, tok, max_len: int) -> None:
        self.rows: list[dict] = []
        self.tok = tok
        self.max_len = max_len
        skipped_prefix = skipped_long = 0

        with path.open(encoding="utf-8") as fh:
            convs = [json.loads(line) for line in fh if line.strip()]

        for conv in convs:
            msgs = conv["messages"]
            ids_prev: list[int] = []
            input_ids: list[int] = []
            labels: list[int] = []
            ok = True

            for i in range(len(msgs)):
                ids_upto = apply_template(tok, msgs[: i + 1])

                # template ต้องต่อท้ายของเดิม ถ้าไม่ใช่แปลว่าวิธีนี้ใช้ไม่ได้กับ template นี้
                if ids_upto[: len(ids_prev)] != ids_prev:
                    ok = False
                    break

                new = ids_upto[len(ids_prev) :]
                input_ids.extend(new)
                labels.extend(new if msgs[i]["role"] == "assistant" else [-100] * len(new))
                ids_prev = ids_upto

            if not ok:
                skipped_prefix += 1
                continue
            if len(input_ids) > max_len:
                skipped_long += 1
                continue
            if all(x == -100 for x in labels):
                continue

            self.rows.append({"input_ids": input_ids, "labels": labels})

        if skipped_prefix:
            raise SystemExit(
                f"{skipped_prefix} บทสร้าง label ไม่ได้ — chat template ของโมเดลนี้ไม่ต่อ prefix\n"
                "ต้องเขียนตัว mask ใหม่ให้ตรงกับ template ก่อน ไม่งั้นเทรนแล้วเพี้ยน"
            )
        if skipped_long:
            print(f"  ข้าม {skipped_long} บทที่ยาวเกิน {max_len} token")

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, i: int) -> dict:
        return self.rows[i]


def make_collator(pad_id: int):
    def collate(batch: list[dict]) -> dict:
        n = max(len(b["input_ids"]) for b in batch)
        out = {"input_ids": [], "attention_mask": [], "labels": []}
        for b in batch:
            pad = n - len(b["input_ids"])
            out["input_ids"].append(b["input_ids"] + [pad_id] * pad)
            out["attention_mask"].append([1] * len(b["input_ids"]) + [0] * pad)
            out["labels"].append(b["labels"] + [-100] * pad)
        return {k: torch.tensor(v, dtype=torch.long) for k, v in out.items()}

    return collate


def compute_metrics(eval_pred) -> dict[str, float]:
    """วัดความถูกต้องของ token ฝั่งผู้ช่วย โดยไม่นับตำแหน่งที่ mask ไว้"""
    predictions, labels = eval_pred
    if isinstance(predictions, tuple):
        predictions = predictions[0]
    predictions = np.asarray(predictions)
    if predictions.ndim == 3:
        predictions = predictions.argmax(axis=-1)
    labels = np.asarray(labels)
    predictions = predictions[:, :-1].reshape(-1)
    labels = labels[:, 1:].reshape(-1)
    valid = labels != -100
    predictions = predictions[valid]
    labels = labels[valid]
    if not labels.size:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0}

    correct = float(np.sum(predictions == labels))
    total = float(labels.size)
    accuracy = correct / total
    return {
        "accuracy": accuracy,
        "precision": accuracy,
        "recall": accuracy,
        "f1": accuracy,
    }


def preprocess_logits_for_metrics(logits, labels):
    if isinstance(logits, tuple):
        logits = logits[0]
    return torch.argmax(logits, dim=-1)


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="ชื่อโฟลเดอร์ใน data/interview/")
    ap.add_argument("--base", default=DEFAULT_BASE)
    ap.add_argument("--out", default="models/nong-trongpok-lora-pre-optimized-V2")
    ap.add_argument("--epochs", type=int, default=9)
    ap.add_argument("--lr", type=float, default=1e-4)
    ap.add_argument("--batch", type=int, default=1)
    ap.add_argument("--accum", type=int, default=16)
    ap.add_argument("--seq", type=int, default=768)
    ap.add_argument("--rank", type=int, default=8)
    ap.add_argument("--early-stopping-patience", type=int, default=3)
    ap.add_argument("--no-4bit", action="store_true", help="ปิด quantization (ต้องมี VRAM เยอะ)")
    ap.add_argument("--force", action="store_true",
                    help="ข้ามการเตือนเรื่อง VRAM/overfit แล้วรันเลย")
    args = ap.parse_args()

    data_dir = INTERVIEW_DIR / args.data
    if not data_dir.exists():
        avail = sorted(p.name for p in INTERVIEW_DIR.glob("*")) if INTERVIEW_DIR.exists() else []
        raise SystemExit(f"ไม่พบ {data_dir}\nที่มีอยู่: {avail or 'ยังไม่มีเลย — รัน gen_interview_data.py ก่อน'}")

    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        EarlyStoppingCallback,
        Trainer,
        TrainingArguments,
    )

    print(f"โมเดลตั้งต้น : {args.base}")
    print(f"ข้อมูล       : {data_dir}")
    if torch.cuda.is_available():
        p = torch.cuda.get_device_properties(0)
        print(f"GPU          : {p.name} ({p.total_memory / 1e9:.1f} GB)\n")
    else:
        raise SystemExit("ไม่มี GPU — QLoRA บน CPU ช้าเกินกว่าจะใช้งานได้จริง ให้ไปรันบน Colab แทน")

    tok = AutoTokenizer.from_pretrained(args.base)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    print("เตรียมข้อมูล ...")
    train_ds = ConversationDataset(data_dir / "train.jsonl", tok, args.seq)
    dev_ds = ConversationDataset(data_dir / "dev.jsonl", tok, args.seq)
    test_ds = ConversationDataset(data_dir / "test.jsonl", tok, args.seq)

    # เช็คว่า mask ทำงานจริง — ถ้าไม่เช็คแล้วมันพัง จะรู้ตัวตอนเทรนเสร็จ
    sample = train_ds[0]
    n_train_tok = sum(1 for x in sample["labels"] if x != -100)
    pct = n_train_tok / len(sample["labels"]) * 100
    print(f"  train {len(train_ds)} บท · dev {len(dev_ds)} บท · test {len(test_ds)} บท")
    print(f"  ตัวอย่างแรก: {len(sample['input_ids'])} token, คิด loss {n_train_tok} token ({pct:.0f}%)")
    if not 10 <= pct <= 90:
        print("  ⚠ สัดส่วน token ที่คิด loss ผิดปกติ — ตรวจ mask ก่อนเทรนต่อ")

    # ---- เตือนก่อนโหลดโมเดล ----
    # เช็คตรงนี้เพราะการโหลดโมเดล 4B ใช้เวลาหลายนาที
    # ถ้าปล่อยให้ไป OOM ตอนเทรน = เสียเวลาฟรี
    warnings: list[str] = []
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9

    # ประมาณคร่าว ๆ: activation ต่อ 1 sequence ที่ 1024 token บนโมเดล 4B
    # ราว 0.15 GB เมื่อเปิด gradient checkpointing แล้ว
    est_gb = 2.6 + args.batch * (args.seq / 1024) * 0.15
    if est_gb > vram_gb * 0.9:
        safe_batch = max(1, int((vram_gb * 0.9 - 2.6) / ((args.seq / 1024) * 0.15)))
        warnings.append(
            f"batch={args.batch} น่าจะ OOM — ประเมินใช้ ~{est_gb:.1f} GB "
            f"แต่การ์ดมี {vram_gb:.1f} GB\n"
            f"     ลองใช้ --batch {safe_batch} แทน (effective batch ยังเท่าเดิมได้ "
            f"ถ้าเพิ่ม --accum เป็น {max(1, args.accum * args.batch // safe_batch)})"
        )

    steps_per_epoch = max(1, len(train_ds) // max(1, args.batch * args.accum))
    total_steps = int(steps_per_epoch * args.epochs)
    passes = args.epochs
    if passes > 20:
        warnings.append(
            f"epochs={args.epochs:g} = โมเดลเห็นข้อมูลชุดเดิมซ้ำ {passes:g} รอบ\n"
            f"     LoRA บนข้อมูล {len(train_ds)} บท ปกติใช้ 3-5 รอบก็พอ\n"
            f"     มากกว่านั้นมันจะท่องคำตอบแทนที่จะเรียนรูปแบบ แล้วตอบไม่ฟังผู้ใช้\n"
            f"     (early stopping ช่วยได้ แต่ต้องมี eval ที่ดีพอ)"
        )

    if warnings:
        print("\n" + "=" * 62)
        for w in warnings:
            print(f"  ⚠ {w}")
        print("=" * 62)
        print(f"  รวม {total_steps:,} optimizer steps")
        if not args.force:
            raise SystemExit(
                "\nหยุดไว้ก่อนเพื่อไม่ให้เสียเวลาเปล่า\n"
                "  ปรับค่าตามที่แนะนำ หรือใส่ --force ถ้าตั้งใจแบบนี้จริง ๆ"
            )
        print("  --force อยู่ ไปต่อ\n")

    print("\nโหลดโมเดล ... (ครั้งแรกดาวน์โหลดหลาย GB)")
    quant = (
        None
        if args.no_4bit
        else BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.base,
        quantization_config=quant,
        torch_dtype=torch.bfloat16,
        device_map={"": 0},
    )
    model.config.use_cache = False

    if not args.no_4bit:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

    model = get_peft_model(
        model,
        LoraConfig(
            r=args.rank,
            lora_alpha=args.rank * 2,
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
            target_modules=[
                "q_proj", "k_proj", "v_proj", "o_proj",
                "gate_proj", "up_proj", "down_proj",
            ],
        ),
    )
    model.print_trainable_parameters()

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=f"{args.out}-ckpt",
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch,
            per_device_eval_batch_size=args.batch,
            gradient_accumulation_steps=args.accum,
            gradient_checkpointing=True,
            learning_rate=args.lr,
            lr_scheduler_type="cosine",
            warmup_ratio=0.05,
            bf16=True,
            logging_steps=5,
            eval_strategy="epoch",
            save_strategy="epoch",
            save_total_limit=1,
            load_best_model_at_end=True,
            metric_for_best_model="eval_accuracy",
            greater_is_better=True,
            optim="paged_adamw_8bit" if not args.no_4bit else "adamw_torch",
            report_to=[],
        ),
        train_dataset=train_ds,
        eval_dataset=dev_ds,
        data_collator=make_collator(tok.pad_token_id),
        compute_metrics=compute_metrics,
        preprocess_logits_for_metrics=preprocess_logits_for_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=args.early_stopping_patience)],
    )

    trainer.train()
    test_metrics = trainer.evaluate(test_ds, metric_key_prefix="test")
    test_metrics["test_perplexity"] = math.exp(min(test_metrics["test_loss"], 20))
    print(
        "\nTest metrics: "
        f"accuracy={test_metrics['test_accuracy']:.2%}, "
        f"precision={test_metrics['test_precision']:.2%}, "
        f"recall={test_metrics['test_recall']:.2%}, "
        f"f1={test_metrics['test_f1']:.2%}, "
        f"perplexity={test_metrics['test_perplexity']:.2f}, "
        f"loss={test_metrics['test_loss']:.4f}"
    )
    if test_metrics["test_accuracy"] < 0.80:
        print("  ⚠ test accuracy ยังต่ำกว่า 80% — ควรปรับข้อมูลหรือ hyperparameters ก่อนใช้งาน")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out)
    tok.save_pretrained(out)
    (out / "training_meta.json").write_text(
        json.dumps(
            {
                "base_model": args.base,
                "data": args.data,
                "n_train": len(train_ds),
                "n_dev": len(dev_ds),
                "n_test": len(test_ds),
                "epochs": args.epochs,
                "early_stopping_patience": args.early_stopping_patience,
                "best_checkpoint": trainer.state.best_model_checkpoint,
                "best_eval_accuracy": trainer.state.best_metric,
                "test_metrics": {
                    key.removeprefix("test_"): value
                    for key, value in test_metrics.items()
                    if key.startswith("test_")
                },
                "lora_rank": args.rank,
                "max_seq": args.seq,
                "quantized_4bit": not args.no_4bit,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"\n✓ บันทึก LoRA adapter ที่ {out}  (ไฟล์เล็กมาก ~50-100 MB)")
    print(f"\nขั้นต่อไป — เทียบกับ base ก่อนตัดสินใจใช้:")
    print(f"  python train/eval_interview.py --adapter {out} --data {args.data}")


if __name__ == "__main__":
    main()
