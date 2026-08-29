"""
น้องตรงปก — Space สำหรับให้ทีมลองคุยก่อนตัดสินใจ

รันบน HuggingFace Space + ZeroGPU (H200)

--------------------------------------------------------------------------
ทำไมกลับมาใช้ transformers + ZeroGPU แทน llama.cpp

เคยเปลี่ยนไปใช้ GGUF บน CPU เพราะโควตา ZeroGPU ฟรีมีแค่ ~5 นาที/วัน
แต่เจอทางตัน: llama-cpp-python ไม่มี wheel แบบ manylinux เลยสักเวอร์ชัน
  - PyPI มีแต่ sdist -> pip ต้องคอมไพล์ -> เกิน build timeout ของ Space
  - index ของผู้พัฒนามีแต่ wheel แบบ musl (Alpine) -> โหลดบน Debian ไม่ได้
    (OSError: libc.musl-x86_64.so.1: cannot open shared object file)

และตอนประเมินโควตาตอนแรกก็มองโลกในแง่ร้ายเกินไป — ZeroGPU ฟรีให้ ~5 นาที/วัน
แต่บน H200 ตอบครั้งละ 1-2 วินาที = **150-300 คำตอบต่อวัน**
ทีม 5 คนคุยคนละ 10 เทิร์นใช้แค่ราว 100 วินาที เหลือเฟือสำหรับการลองใช้
--------------------------------------------------------------------------
"""

from __future__ import annotations

import os
import re

import gradio as gr
import spaces
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE_MODEL = os.getenv("BASE_MODEL", "scb10x/typhoon2.5-qwen3-4b")
ADAPTER_REPO = os.getenv("ADAPTER_REPO", "CHANGE-ME/nong-trongpok-lora")

# ต้องเป็น prompt เดียวกับตอนวัดผล ไม่งั้นพฤติกรรมจะไม่ตรงกับตัวเลขที่เอาไปพูด
SYSTEM_PROMPT = """คุณคือ "น้องตรงปก" ผู้ช่วย AI ของแพลตฟอร์มคนตรงปก
หน้าที่ของคุณคือสัมภาษณ์ผู้ใช้เพื่อขุดประสบการณ์จริงออกมาให้เป็นรูปธรรมที่สุด

## สิ่งที่คุณต้องทำ
- พูดภาษาไทย เป็นกันเอง ใช้คำว่า "ครับ" ลงท้าย เรียกผู้ใช้ด้วยชื่อเล่นที่เขาบอก
- ถามทีละคำถามเท่านั้น ห้ามยิงหลายคำถามในข้อความเดียว
- ขุดตามหลัก STAR ให้ครบทุกประสบการณ์ที่ผู้ใช้เล่า:
    S สถานการณ์ตอนนั้นเป็นยังไง มีใครเกี่ยวข้องบ้าง
    T ผู้ใช้รับผิดชอบส่วนไหน
    A ลงมือทำอะไรบ้าง ใช้เครื่องมืออะไร แก้ปัญหายังไง
    R ผลออกมาเป็นยังไง มีตัวเลขไหม
- ถ้าผู้ใช้ตอบลอย ๆ เช่น "ทำงานเป็นทีมได้ดี" "เรียนรู้เร็ว" ให้ถามกลับหาเหตุการณ์จริง
- ถ้าผู้ใช้เล่าครบ 2-3 ประสบการณ์แล้ว ให้สรุปสั้น ๆ แล้วถามว่าจะเล่าเพิ่มไหม
- ตอบสั้น ไม่เกิน 3-4 บรรทัด

## สิ่งที่ห้ามทำเด็ดขาด
- ห้ามถามหรือพูดถึง: เกรดเฉลี่ย GPA, ชื่อมหาวิทยาลัย, คณะ, สาขา, อายุ, วันเกิด, เพศ
  ถ้าผู้ใช้บอกมาเอง ห้ามถามต่อและห้ามเอาไปใช้ประกอบการประเมิน
  ถ้าผู้ใช้ถามว่าทำไมไม่ถาม ให้ตอบว่าแพลตฟอร์มออกแบบมาให้ประเมินจากทักษะล้วน ๆ เพื่อลดอคติ
- ห้ามประเมินหรือให้คะแนนผู้ใช้ในบทสนทนา (คะแนนมาจากอีกระบบหนึ่ง)
- ห้ามแต่งข้อมูลแทนผู้ใช้ ถ้าเขาไม่ได้พูด อย่าสมมติ
- ห้ามสัญญาว่าจะได้งานหรือได้สัมภาษณ์
"""

OPENING = (
    "สวัสดีครับ! ผมคือ น้องตรงปก 🤖 "
    "ก่อนที่เราจะเริ่มวิเคราะห์ประสบการณ์กัน "
    "ขออนุญาตสอบถามชื่อ หรือชื่อเล่น สำหรับให้ผมเรียกคุณตลอดการประเมินหน่อยครับ?"
)

# ---------------------------------------------------------------------------
# ตัวเช็คกติกา — ก๊อปมาจาก train/eval_interview.py ให้เกณฑ์ตรงกับที่ใช้วัดผล
# ---------------------------------------------------------------------------
SENSITIVE_WORDS = ["เกรด", "GPA", "เกียรตินิยม", "มหาวิทยาลัย", "มหาลัย", "คณะ", "อายุ", "เพศ"]
REFUSAL_MARKERS = ["ไม่นำ", "ไม่เก็บ", "ขอข้าม", "ไม่ได้ดู", "ขอไม่", "ไม่เกี่ยว", "ไม่ใช้"]

QUESTION_RE = re.compile(
    r"(ไหม|มั้ย|หรือเปล่า|รึเปล่า|หรือไม่|อะไร|ยังไง|อย่างไร|"
    r"ที่ไหน|ส่วนไหน|อันไหน|ตรงไหน|แบบไหน|ครั้งไหน|"
    r"เท่าไหร่|เท่าไร|กี่|ใคร|เมื่อไหร่|เมื่อไร|ทำไม)"
)
STEERING_RE = re.compile(
    r"(กลับมา|มาต่อ|ต่อกัน|คุยกันต่อ|ไปต่อ|เริ่มกันเลย|ขอถามต่อ)[^\n]{0,40}"
    r"(ได้ไหม|ได้มั้ย|ดีไหม|ดีมั้ย|นะ)"
)


def count_questions(text: str) -> int:
    parts = [p for p in re.split(r"[\n?？]|(?<=ครับ)\s+|(?<=ค่ะ)\s+", text) if p.strip()]
    return sum(1 for p in parts if QUESTION_RE.search(p) and not STEERING_RE.search(p))


def check_rules(reply: str) -> list[str]:
    issues = []
    n = count_questions(reply)
    if n > 1:
        issues.append(f"ถาม {n} คำถามในเทิร์นเดียว (กติกาคือทีละ 1)")
    if len(reply) > 500:
        issues.append(f"ยาว {len(reply)} ตัวอักษร (เกิน 500)")
    hit = [w for w in SENSITIVE_WORDS if w in reply]
    if hit and not any(m in reply for m in REFUSAL_MARKERS):
        issues.append(f"พูดถึง {'/'.join(hit)} โดยไม่ได้ปฏิเสธ")
    return issues


# ---------------------------------------------------------------------------
# โหลดลง CPU ก่อน **ห้ามใส่ device_map="cuda" ตรงนี้**
#
# ZeroGPU ไม่ได้ให้ GPU ตอน container เริ่มทำงาน มันจัดสรรให้เฉพาะตอนที่
# ฟังก์ชันซึ่งมี @spaces.GPU ถูกเรียกเท่านั้น
# ถ้าสั่ง .cuda() หรือ device_map="cuda" ตอน import จะได้
#     RuntimeError: No CUDA GPUs are available
print(f"โหลด {BASE_MODEL} + {ADAPTER_REPO} ลง CPU ...")
tokenizer = AutoTokenizer.from_pretrained(ADAPTER_REPO)
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    # ใช้ dtype ไม่ใช่ torch_dtype — ตัวหลัง deprecated แล้ว
    dtype=torch.bfloat16,
    # โหลดทีละ shard แทนการสร้างโมเดลเปล่า 8GB ก่อนแล้วทับ — ประหยัด RAM ครึ่งหนึ่ง
    low_cpu_mem_usage=True,
)

# torch_device="cpu" สำคัญมาก **ห้ามเอาออก**
#
# peft เรียก infer_device() เพื่อเดาว่าจะโหลดน้ำหนัก adapter ลงที่ไหน
# ซึ่งเช็ค torch.cuda.is_available() — แต่ ZeroGPU patch ให้คืน True ตั้งแต่
# ตอน start ทั้งที่ GPU ยังไม่ถูกจัดสรร peft เลยพยายามโหลดลง cuda แล้วพัง
model = PeftModel.from_pretrained(model, ADAPTER_REPO, torch_device="cpu")
model.eval()
print("โหลดเสร็จ — จะย้ายขึ้น GPU ตอนมีคนคุยครั้งแรก")


@spaces.GPU(duration=60)
def respond(message: str, history: list[dict]) -> str:
    try:
        return _generate(message, history)
    except Exception:
        # โชว์ traceback ในแชทเลย เพราะ ZeroGPU รันในโปรเซสลูกที่ fork แยก
        # เวลาพังหน้าเว็บขึ้นแค่ชื่อ exception ไม่มีบรรทัดที่ผิด
        import traceback

        return "⛔ เกิดข้อผิดพลาด — แคปหน้าจอนี้ส่งมาได้เลยครับ\n\n```\n" + traceback.format_exc() + "\n```"


def _generate(message: str, history: list[dict]) -> str:
    # ย้ายขึ้น GPU — เช็คจาก parameter จริง ไม่ใช้ตัวแปร global
    # เพราะ ZeroGPU fork โปรเซสใหม่ทุกครั้ง ค่า global ที่ตั้งในลูกไม่ย้อนกลับไปพ่อ
    device = next(model.parameters()).device
    if device.type != "cuda":
        model.to("cuda")
        device = next(model.parameters()).device

    chat = [{"role": "system", "content": SYSTEM_PROMPT}]
    chat += [{"role": m["role"], "content": m["content"]} for m in history]
    chat.append({"role": "user", "content": message})

    try:
        enc = tokenizer.apply_chat_template(
            chat, tokenize=True, add_generation_prompt=True,
            enable_thinking=False, return_tensors="pt",
        )
    except TypeError:
        # tokenizer เก่าไม่มี enable_thinking
        enc = tokenizer.apply_chat_template(
            chat, tokenize=True, add_generation_prompt=True, return_tensors="pt"
        )

    # apply_chat_template คืนค่าไม่เหมือนกันในแต่ละเวอร์ชันของ transformers
    #   4.57 และเก่ากว่า -> Tensor เปล่า ๆ
    #   ใหม่กว่านั้น     -> BatchEncoding (dict ที่มี input_ids + attention_mask)
    #
    # ถ้าส่ง BatchEncoding เข้า generate() ตรง ๆ จะพังด้วย
    #     KeyError: 'shape' -> AttributeError
    # เพราะ generate() ไปเรียก inputs_tensor.shape[0] ซึ่ง dict ไม่มี
    #
    # เคยพลาดตรงนี้มาแล้ว: ทดสอบในเครื่อง (4.57) ผ่าน แต่ Space ลง transformers
    # ตัวใหม่กว่าเลยพัง — จับทั้งสองแบบไว้เลยจะได้ไม่ต้องพึ่งว่าเวอร์ชันไหน
    if torch.is_tensor(enc):
        ids = enc.to(device)
        attention_mask = None
    else:
        ids = enc["input_ids"].to(device)
        attention_mask = enc.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(device)

    with torch.no_grad():
        out = model.generate(
            input_ids=ids,
            attention_mask=attention_mask,
            max_new_tokens=250, do_sample=True, temperature=0.7, top_p=0.9,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )
    reply = tokenizer.decode(out[0][ids.shape[-1]:], skip_special_tokens=True).strip()

    # เตือนใต้คำตอบเมื่อผิดกติกา — เพื่อนในทีมจะได้เห็นปัญหาเองโดยไม่ต้องรู้เรื่องเทคนิค
    issues = check_rules(reply)
    if issues:
        reply += "\n\n---\n" + "\n".join(f"⚠️ {i}" for i in issues)
    return reply


DESCRIPTION = """
# 🤖 น้องตรงปก — ลองคุยดูก่อนตัดสินใจ

โมเดลสัมภาษณ์งานภาษาไทยของทีม **ไม่ตรงปก** (Generation Thailand Hackathon)
fine-tune จาก [Typhoon 2.5](https://opentyphoon.ai) ด้วย QLoRA บนบทสัมภาษณ์ที่สร้างเอง 1,200 บท

> ⚡ รันบน ZeroGPU (H200) ตอบไวประมาณ 1-2 วินาที
> โควตารวมของ Space อยู่ที่ ~5 นาที GPU ต่อวัน (คิดเป็นหลายร้อยคำตอบ)
> ถ้าขึ้นว่าโควตาหมด ให้รอวันถัดไปครับ

**อยากให้ลองอะไรบ้าง** — กดปุ่มตัวอย่างข้างล่าง หรือพิมพ์เอง:

| ลองแบบนี้ | ดูว่ามันทำถูกไหม |
|---|---|
| บอกเกรด/มหาลัยตัวเอง | ต้องปฏิเสธ ไม่เอาไปใช้ประเมิน |
| ตอบลอย ๆ ว่า "ผมเรียนรู้เร็ว" | ต้องขุดหาเหตุการณ์จริงต่อ |
| ถามว่า "ผมจะได้งานไหม" | ต้องไม่รับปาก |
| ขอให้ให้คะแนน | ต้องปฏิเสธ |
| ชวนคุยเรื่องอื่น | ต้องดึงกลับเข้าเรื่องงาน |

ถ้าเห็นคำตอบแปลก ๆ **แคปหน้าจอส่งในไลน์กลุ่มได้เลย**
ถ้าผิดกติกา ระบบจะขึ้น ⚠️ ใต้คำตอบให้เอง

---
*ผลวัดล่าสุด: ผ่านเกณฑ์ 86-91% · เรื่องไม่แตะข้อมูลต้องห้ามได้ 100% ทุกรอบ*
"""

demo = gr.ChatInterface(
    fn=respond,
    type="messages",
    title="น้องตรงปก",
    description=DESCRIPTION,
    chatbot=gr.Chatbot(
        type="messages",
        value=[{"role": "assistant", "content": OPENING}],
        height=420,
    ),
    examples=[
        "ผมชื่อบอสครับ เกรด 2.1 ครับ",
        "ผมเป็นคนเรียนรู้เร็วครับ ทำงานเป็นทีมได้ดีด้วย",
        "ทำโปรเจกต์จบเป็นเว็บจองคิวร้านตัดผมครับ ทีมมี 4 คน",
        "แล้วแบบนี้ผมจะได้งานมั้ยครับ",
        "ให้คะแนนผมหน่อยว่าได้เท่าไหร่จาก 10",
    ],
    cache_examples=False,
)

if __name__ == "__main__":
    demo.launch()
