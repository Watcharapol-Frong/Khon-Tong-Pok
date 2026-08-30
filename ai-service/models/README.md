# โมเดล — ตัวไฟล์อยู่ที่ HuggingFace ไม่ได้อยู่ใน git

โฟลเดอร์นี้ในเครื่องมีของอยู่ **589 MB** แต่ใน repo เก็บแค่ metadata กับผลวัด

## ทำไมไม่เอาน้ำหนักโมเดลขึ้น git

| | |
|---|---|
| `adapter_model.safetensors` | **63 MB ต่อไฟล์** — เกินเกณฑ์เตือนของ GitHub ที่ 50 MB ต้องใช้ Git LFS |
| LFS ฟรีของ GitHub | 1 GB storage + **1 GB bandwidth ต่อเดือน** |
| ถ้าใส่ 589 MB | กินครึ่ง storage ทันที และเพื่อน 5 คน clone รอบเดียว ≈ 3 GB bandwidth → **โควตาหมด LFS ถูกปิดทั้ง repo** |
| `optimizer.pt` ×15 | 163 MB ที่ไม่มีประโยชน์เลยหลังเทรนจบ (ใช้แค่ตอนเทรนค้างแล้วต่อ) |

และ git เก็บ diff ของ binary ไม่ได้ — เทรนใหม่ทีนึงคือเพิ่มไฟล์เต็ม ๆ อีกก้อน
ประวัติ git ลบทีหลังยากมาก ต้อง rewrite ทั้งสายแล้วทุกคนต้อง re-clone

HuggingFace ทำมาเพื่อเก็บ weight โดยเฉพาะ ฟรี มีเวอร์ชัน และไม่จำกัด bandwidth

## เอาโมเดลมายังไง

```bash
pip install huggingface_hub
huggingface-cli download Lemonade44/nong-trongpok-lora --local-dir models/nong-trongpok-lora-pre-optimized-V2
```

หรือให้โค้ดโหลดเองตอนรัน (`hf_space/app.py` ทำแบบนี้อยู่):

```python
from peft import PeftModel
model = PeftModel.from_pretrained(base_model, "Lemonade44/nong-trongpok-lora")
```

> เปลี่ยนชื่อ user ตรงนี้ถ้าอัปขึ้นบัญชีอื่น — ดู `scripts/publish_hf.py`

ลองใช้ผ่านเว็บโดยไม่ต้องโหลดอะไร: https://huggingface.co/spaces/Lemonade44/nong-trongpok

## อัปเวอร์ชันใหม่ขึ้น HF

```bash
python scripts/publish_hf.py --user Lemonade44
```

สคริปต์**ไม่รับ token เป็นอาร์กิวเมนต์** โดยตั้งใจ — token ที่พิมพ์ในคำสั่งจะไปค้าง
อยู่ใน shell history ให้ `huggingface-cli login` ไว้ก่อนแล้วสคริปต์อ่านจาก cache เอง

## ที่เก็บไว้ใน git

| ไฟล์ | ทำไมต้องเก็บ |
|---|---|
| `eval_interview.json` | ผลวัด 13 สถานการณ์ 7 เกณฑ์ — **หลักฐานของตัวเลข 88% ที่ขึ้นสไลด์** ถ้าไม่เก็บไว้ ตัวเลขบนสไลด์ก็ไม่มีอะไรรองรับ |
| `probe_api_results.json` | คำตอบดิบจากการวัดผ่าน API จริง |
| `*/adapter_config.json` | rank, target modules — ต้องมีถึงจะเทรนซ้ำให้เหมือนเดิมได้ |
| `*/training_meta.json` | seed, จำนวนข้อมูล, epoch, metrics |

## ผลของ V2 (ตัวที่ใช้อยู่)

| | |
|---|---|
| base | `scb10x/typhoon2.5-qwen3-4b` |
| ข้อมูล | train 590 · dev 76 · test 69 (seed 42) |
| LoRA rank | 8 · max_seq 768 · 4-bit |
| epoch | 9 (early stopping patience 3, ได้ดีสุดที่ checkpoint 296) |
| test accuracy | 0.9878 |
| test loss | 0.0227 |

เลข accuracy นี้เป็น **token-level ของ language modelling** ไม่ใช่ "ตอบถูกตามกติกา 98%"
ตัวที่บอกว่าโมเดลทำตามกติกาของทีมได้แค่ไหนคือ `eval_interview.json` (88%)
อย่าเอา 0.9878 ขึ้นสไลด์ครับ มันวัดคนละเรื่องกัน
