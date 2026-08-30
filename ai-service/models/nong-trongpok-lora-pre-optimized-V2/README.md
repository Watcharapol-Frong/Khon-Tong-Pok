---
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
ADAPTER = "Lemonade44/nong-trongpok-lora"

tok = AutoTokenizer.from_pretrained(ADAPTER)
model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype="bfloat16", device_map="cuda")
model = PeftModel.from_pretrained(model, ADAPTER)

chat = [
    {"role": "system", "content": SYSTEM_PROMPT},   # ดู README ของ Space
    {"role": "user", "content": "ผมชื่อเฟร้นครับ"},
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
huggingface-cli download Lemonade44/nong-trongpok-lora nong-trongpok-lora-f16.gguf

llama-cli -m typhoon2.5-qwen3-4b-q4_k_m.gguf \
          --lora nong-trongpok-lora-f16.gguf \
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
{
  "base_model": "scb10x/typhoon2.5-qwen3-4b",
  "data": "1200-seed42-20260825-021357",
  "n_train": 590,
  "n_dev": 76,
  "n_test": 69,
  "epochs": 9,
  "early_stopping_patience": 3,
  "best_checkpoint": "models/nong-trongpok-lora-pre-optimized-V2-ckpt\\checkpoint-296",
  "best_eval_accuracy": 0.9880765610291811,
  "test_metrics": {
    "loss": 0.022748451679944992,
    "accuracy": 0.9877584138855571,
    "precision": 0.9877584138855571,
    "recall": 0.9877584138855571,
    "f1": 0.9877584138855571,
    "runtime": 85.0297,
    "samples_per_second": 0.811,
    "steps_per_second": 0.811,
    "perplexity": 1.0230091709399034
  },
  "lora_rank": 8,
  "max_seq": 768,
  "quantized_4bit": true
}
```
