"""
อัปโหลด adapter + Space ขึ้น HuggingFace ให้ทีมลองใช้

    huggingface-cli login          # ทำครั้งเดียว ใส่ token ของคุณเอง
    python scripts/publish_hf.py --user <ชื่อ HF ของคุณ> --dry-run
    python scripts/publish_hf.py --user <ชื่อ HF ของคุณ>

--------------------------------------------------------------------------
เรื่อง token

สคริปต์นี้ **ไม่รับ token เป็น argument และไม่อ่านจากไฟล์ในโปรเจกต์**
มันใช้ token ที่ `huggingface-cli login` เก็บไว้ในเครื่องคุณเท่านั้น

เหตุผล: token ที่พิมพ์ลง command line จะไปโผล่ใน shell history
และถ้าเผลอ commit ไฟล์ที่มี token ขึ้น GitHub = ใครก็ลบ/แก้โมเดลเราได้

ถ้ายังไม่เคย login:  https://huggingface.co/settings/tokens -> New token -> Write
--------------------------------------------------------------------------

สิ่งที่จะอัปโหลด (ตรวจแล้วว่าไม่มีข้อมูลส่วนบุคคล):
  - adapter 79 MB (น้ำหนัก LoRA + tokenizer) + GGUF 33 MB สำหรับ llama.cpp
  - training_meta.json (ค่า hyperparameter, ไม่มีข้อมูลคน)
  - Space (โค้ด Gradio)

ข้อมูลที่ใช้เทรนเป็นบทสนทนาสังเคราะห์ทั้งหมด ไม่มีเรซูเม่หรือข้อมูลของใครจริง ๆ
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ADAPTER = ROOT / "models" / "nong-trongpok-lora-pre-optimized-V2"
SPACE_DIR = ROOT / "hf_space"

MODEL_CARD = """---
license: apache-2.0
base_model: scb10x/typhoon2.5-qwen3-4b
library_name: peft
language:
  - th
tags:
  - thai
  - interview
  - lora
  - typhoon
---

# น้องตรงปก — LoRA adapter

AI สัมภาษณ์งานภาษาไทยของทีม **ไม่ตรงปก** (Generation Thailand's HACKATHON)

LoRA adapter สำหรับ [`scb10x/typhoon2.5-qwen3-4b`](https://huggingface.co/scb10x/typhoon2.5-qwen3-4b)

## จุดประสงค์

สัมภาษณ์ผู้สมัครงานเป็นภาษาไทยเพื่อขุดประสบการณ์จริงตามหลัก STAR
โดย **ไม่ถามและไม่ใช้ เกรด / มหาวิทยาลัย / คณะ / อายุ / เพศ** เพื่อลดอคติในการคัดเลือก

## ทำไมต้อง fine-tune

เขียนกติกาใน prompt เฉย ๆ เอาไม่อยู่ โดยเฉพาะเมื่อผู้ใช้พูดข้อมูลต้องห้ามออกมาเอง
หรือมีคนพยายามสั่งให้ลืมกติกา (prompt injection)

| setup | ผ่านเกณฑ์ |
|---|---|
| **fine-tuned + prompt ยาว** | **88%** |
| fine-tuned + prompt สั้น | 79% |
| base + prompt ยาว | 30% |
| base + prompt สั้น | 18% |

วัดผ่าน API จริงอีกรอบได้ 86-91% · เกณฑ์ "ไม่แตะข้อมูลต้องห้าม" ได้ **100% ทุกรอบ**

## วิธีใช้

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE = "scb10x/typhoon2.5-qwen3-4b"
ADAPTER = "{repo}"

tok = AutoTokenizer.from_pretrained(ADAPTER)
model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype="bfloat16", device_map="cuda")
model = PeftModel.from_pretrained(model, ADAPTER)

chat = [
    {{"role": "system", "content": SYSTEM_PROMPT}},   # ดู README ของ Space
    {{"role": "user", "content": "ผมชื่อเฟร้นครับ"}},
]
ids = tok.apply_chat_template(chat, tokenize=True, add_generation_prompt=True,
                             enable_thinking=False, return_tensors="pt").to(model.device)
print(tok.decode(model.generate(ids, max_new_tokens=250)[0][ids.shape[-1]:],
                 skip_special_tokens=True))
```

**ต้องใช้ system prompt ตัวเต็ม** ถึงจะได้ 88% — ใช้ prompt สั้นจะเหลือ 79%

### หรือรันบน CPU ด้วย llama.cpp (ไม่ต้องมี GPU)

repo นี้มีไฟล์ `nong-trongpok-lora-f16.gguf` (33 MB) ให้ด้วย
ใช้คู่กับ base GGUF ทางการได้เลย **ไม่ต้อง merge**

```bash
# base quantized Q4_K_M เหลือ 2.5GB
huggingface-cli download scb10x/typhoon2.5-qwen3-4b-gguf typhoon2.5-qwen3-4b-q4_k_m.gguf
huggingface-cli download {repo} nong-trongpok-lora-f16.gguf

llama-cli -m typhoon2.5-qwen3-4b-q4_k_m.gguf \\
          --lora nong-trongpok-lora-f16.gguf \\
          -sys "<SYSTEM_PROMPT>" -p "ผมชื่อบอสครับ เกรด 2.1 ครับ"
```

วัดได้ ~6.5 tokens/วินาที บนโน้ตบุ๊กทั่วไป

## ข้อมูลเทรน

บทสนทนาสังเคราะห์ **ทั้งหมด** สร้างจากกติกาโดยตรง
**ไม่มีเรซูเม่หรือข้อมูลส่วนบุคคลของคนจริงเลย**

เคสที่จงใจใส่: ผู้ใช้บอกข้อมูลต้องห้ามเอง 28% · ตอบลอย ๆ 35% ·
ถามเรื่องผลลัพธ์/ขอคะแนน 31% · ชวนคุยนอกเรื่อง 22%

## ข้อจำกัด

- โมเดล 4B — ตอบผิดพลาดได้ **ยังไม่ควรใช้ตัดสินใจจ้างงานจริง**
- เทรนบนข้อมูลสังเคราะห์จากเทมเพลต ความหลากหลายจำกัดกว่าบทสนทนาจริง
- ยังไม่ได้ทดสอบกับผู้ใช้จริงในวงกว้าง

## training config

```json
{meta}
```
"""


def check_login() -> str:
    from huggingface_hub import whoami

    try:
        return whoami()["name"]
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(
            "ยังไม่ได้ login เข้า HuggingFace\n\n"
            "  huggingface-cli login\n\n"
            "ขอ token แบบ Write ที่ https://huggingface.co/settings/tokens\n"
            f"({type(exc).__name__})"
        ) from exc


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", required=True, help="ชื่อผู้ใช้ HuggingFace ของคุณ")
    ap.add_argument("--adapter", type=Path, default=DEFAULT_ADAPTER)
    ap.add_argument("--model-name", default="nong-trongpok-lora")
    ap.add_argument("--space-name", default="nong-trongpok")
    ap.add_argument("--private", action="store_true", help="อัปแบบส่วนตัว (แชร์ลิงก์เฉพาะทีม)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-space", action="store_true")
    ap.add_argument("--only-space", action="store_true",
                    help="อัปแค่ Space ไม่ต้องอัป adapter 79MB ซ้ำ (ใช้ตอนแก้บั๊กใน app.py)")
    args = ap.parse_args()

    if not args.adapter.exists():
        raise SystemExit(f"ไม่พบ adapter ที่ {args.adapter}")

    meta_path = args.adapter / "training_meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

    model_repo = f"{args.user}/{args.model_name}"
    space_repo = f"{args.user}/{args.space_name}"

    size_mb = sum(f.stat().st_size for f in args.adapter.rglob("*") if f.is_file()) / 1e6
    print(f"adapter : {args.adapter.name}  ({size_mb:.0f} MB)")
    print(f"model   -> https://huggingface.co/{model_repo}")
    if not args.skip_space:
        print(f"space   -> https://huggingface.co/spaces/{space_repo}")
    print(f"สถานะ   : {'ส่วนตัว' if args.private else 'สาธารณะ'}")

    if args.dry_run:
        print("\n[dry-run] ไม่ได้อัปโหลดจริง")
        print("ไฟล์ที่จะอัปโหลด:")
        for f in sorted(args.adapter.iterdir()):
            if f.is_file():
                print(f"   {f.name:<28} {f.stat().st_size/1e6:>7.1f} MB")
        return

    user = check_login()
    if user != args.user:
        print(f"\n⚠ login อยู่ในชื่อ '{user}' แต่สั่งอัปไปที่ '{args.user}'")
        if input("  ไปต่อไหม? (y/N) ").strip().lower() != "y":
            return

    from huggingface_hub import HfApi

    api = HfApi()

    # ---- 1. model repo ----
    if args.only_space:
        print("\n--only-space: ข้ามการอัป adapter (79 MB) ไปเลย")
    else:
        print(f"\nสร้าง {model_repo} ...")
        api.create_repo(model_repo, repo_type="model", private=args.private, exist_ok=True)

        card = MODEL_CARD.format(
            repo=model_repo, meta=json.dumps(meta, ensure_ascii=False, indent=2)
        )
        (args.adapter / "README.md").write_text(card, encoding="utf-8")

        print("อัปโหลด adapter ...")
        api.upload_folder(
            folder_path=str(args.adapter),
            repo_id=model_repo,
            repo_type="model",
            commit_message="น้องตรงปก LoRA adapter",
        )
        print(f"  ✓ https://huggingface.co/{model_repo}")

    # ---- 2. space ----
    if not args.skip_space:
        print(f"\nสร้าง Space {space_repo} ...")
        try:
            api.create_repo(
                space_repo,
                repo_type="space",
                private=args.private,
                space_sdk="gradio",
                # ต้องเป็น zero-a10g ไม่ใช่ cpu-basic
                #
                # HF เปลี่ยนนโยบายแล้ว: Gradio/Docker Space บน cpu-basic ต้องมี PRO
                # (ขึ้น 402 Payment Required ตอน create) แต่ ZeroGPU ยังฟรีอยู่
                #
                # โค้ดใน app.py รัน llama.cpp บน CPU และ **ไม่มี @spaces.GPU เลย**
                # แปลว่าได้ container ฟรีมาใช้โดยไม่แตะโควตา GPU สักวินาที
                # = คุยได้ไม่จำกัดเหมือนเดิม แค่ยืมชื่อ hardware มาเฉย ๆ
                space_hardware="zero-a10g",
                exist_ok=True,
            )
        except Exception as exc:  # noqa: BLE001
            if "402" in str(exc) or "Payment Required" in str(exc):
                raise SystemExit(
                    "HF ไม่ให้สร้าง Space นี้แบบฟรี\n\n"
                    "  Gradio/Docker Space บน cpu-basic ต้องสมัคร PRO ($9/เดือน)\n"
                    "  ส่วน ZeroGPU ยังฟรี — สคริปต์ตั้งเป็น zero-a10g ให้แล้ว\n\n"
                    "ถ้ายังขึ้น 402 อีก แปลว่าบัญชียังไม่เข้าเงื่อนไข ZeroGPU\n"
                    "  (ต้องยืนยันอีเมลแล้ว และบัญชีอายุเกิน 30 วัน)\n\n"
                    "ทางที่ไม่ต้องเสียเงินเลย: รัน server ในเครื่องแล้วเปิด tunnel\n"
                    "  ดู DEPLOY-WEB.md หัวข้อ 'ทาง A — Tunnel จากโน้ตบุ๊ก'"
                ) from exc
            raise

        # ชี้ app.py ไปที่ repo จริงที่เพิ่งอัปโหลด
        app = (SPACE_DIR / "app.py").read_text(encoding="utf-8")
        app = app.replace('"CHANGE-ME/nong-trongpok-lora"', f'"{model_repo}"')
        tmp = SPACE_DIR / "app.py.upload"
        tmp.write_text(app, encoding="utf-8")

        print("อัปโหลด Space ...")
        api.upload_file(
            path_or_fileobj=str(tmp), path_in_repo="app.py",
            repo_id=space_repo, repo_type="space",
        )
        for name in ("requirements.txt", "README.md"):
            api.upload_file(
                path_or_fileobj=str(SPACE_DIR / name), path_in_repo=name,
                repo_id=space_repo, repo_type="space",
            )
        tmp.unlink()

        print(f"  ✓ https://huggingface.co/spaces/{space_repo}")
        print("\n  Space ใช้เวลา build ~5 นาที (โหลด base GGUF 2.5GB ครั้งแรก)")

    print("\nเสร็จแล้ว — ส่งลิงก์ Space ให้เพื่อนในทีมลองได้เลยครับ")



if __name__ == "__main__":
    main()
