"""
สร้างชุดข้อมูลบทสัมภาษณ์ภาษาไทย สำหรับ fine-tune น้องตรงปก (ชั้น C)

    python train/gen_interview_data.py --n 1200
    python train/gen_interview_data.py --n 1200 --paraphrase   # ต้องมี TYPHOON_API_KEY

ผลลัพธ์: data/interview/<n>-seed<s>-<วันเวลา>/{train,dev,test}.jsonl
รูปแบบ ChatML: {"messages": [{"role": "...", "content": "..."}, ...]}

--------------------------------------------------------------------------
ทำไมสร้างเองได้ (ต่างจาก NER ที่ต้องให้คน label)

งาน NER ต้องรู้ว่า "ทักษะจริง" ในเรซูเม่ไทยหน้าตายังไง ซึ่งเราแต่งเองไม่ได้
แต่งานนี้เราคือคนกำหนดเองว่า "น้องตรงปกควรตอบยังไง" — เรารู้คำตอบที่ถูกอยู่แล้ว
ข้อมูลที่สร้างจากกติกาจึงถูกต้อง 100% โดยการก่อสร้าง ไม่ต้องมานั่งตรวจทีหลัง

โดยเฉพาะกติกาห้ามถาม GPA/มหาลัย/อายุ ที่ prompt อย่างเดียวเอาไม่ค่อยอยู่ —
ในชุดนี้มีเคสที่ผู้ใช้พูดข้อมูลพวกนี้ออกมาเองประมาณ 1 ใน 4 ของบทสนทนา
แล้วสอนให้โมเดลปฏิเสธอย่างสุภาพทุกครั้ง
--------------------------------------------------------------------------
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train.interview_personas import (  # noqa: E402
    CHITCHAT_QUESTIONS,
    DEFLECT_CHITCHAT,
    DEFLECT_OUTCOME,
    DEFLECT_SENSITIVE,
    EXPERIENCES,
    GREET_THEN_ASK,
    NICKNAMES,
    OUTCOME_QUESTIONS,
    OPENINGS,
    PROBE_ACTION,
    PROBE_RESULT,
    PROBE_SITUATION,
    PROBE_TASK,
    PROBE_VAGUE,
    SENSITIVE_LABELS,
    STEER_BACK,
    SENSITIVE_VOLUNTEERS,
    SYSTEM_SHORT,
    TERSE_ANSWERS,
    VAGUE_OPENERS,
    WRAP_UP,
)
from train.paths import DATA_ROOT  # noqa: E402

OUT_ROOT = DATA_ROOT / "interview"

# คำที่ห้ามโผล่ในฝั่งผู้ช่วยเด็ดขาด (ยกเว้นตอนบอกว่า "จะไม่ใช้")
#
# มีแต่คำเรื่องอคติเท่านั้น **ไม่ใส่คำหยาบ** ด้วยเหตุผล 2 ข้อ:
#
# 1. ฝั่งผู้ช่วยเป็นเทมเพลตที่เราเขียนเองทั้งหมด คำหยาบโผล่ไม่ได้อยู่แล้ว
#    ที่ต้องกันคำหยาบคือ "ผลลัพธ์ของโมเดล" ซึ่งไปเช็คที่ eval_interview.py แทน
#
# 2. ภาษาไทยไม่มีช่องว่างระหว่างคำ การเช็ค substring กับคำสั้นจึงชนคำปกติ
#    เคยใส่ "นม" ไว้ แล้วมันไปแมตช์ "คุณนุ่นมี" "คุณปั้นมี" (ชื่อเล่นลงท้าย น + มี)
#    ทิ้งบทสนทนาดี ๆ ไป 78% โดยไม่มีใครรู้ตัว
#    คำเสี่ยงแบบเดียวกัน: "ล่อ" อยู่ใน "คล่องแคล่ว", "หี" อยู่ใน "มหีบ"
#
# คำในลิสต์นี้ยาวและเฉพาะพอที่จะไม่ชนคำปกติ
FORBIDDEN_IN_QUESTION = [
    "เกรด", "GPA", "เกียรตินิยม", "มหาวิทยาลัย", "มหาลัย", "คณะ", "อายุ", "เพศ",
]


# ---------------------------------------------------------------------------
PRONOUNS = ("ผม", "หนู", "ดิฉัน", "เรา","เตง")
VOICE_CHOICES = [("ผม", "ครับ"), ("หนู", "ค่ะ"), ("ดิฉัน", "ค่ะ"), ("เรา", "ครับ"), ("เตง", "ครับ")]


class Voice:
    """
    สรรพนามและคำลงท้ายของผู้ใช้ ให้คงเส้นคงวาทั้งบทสนทนา

    หมายเหตุ: ห้ามใช้ \\b ใน regex กับภาษาไทย — ไทยไม่มีช่องว่างระหว่างคำ
    "เราปรับตัว" จะไม่มี word boundary หลัง "เรา" เลยแทนไม่ติด แล้วได้
    ประโยคปนอย่าง "เราปรับตัวเก่งครับ" ออกมา เลยแทนเฉพาะสรรพนามตัวหน้าสุดแทน
    """

    def __init__(self, rng: random.Random, forced: tuple[str, str] | None = None) -> None:
        self.pronoun, self.particle = forced or rng.choice(VOICE_CHOICES)

    @staticmethod
    def detect(text: str) -> tuple[str, str] | None:
        """อ่านสรรพนาม/คำลงท้ายจากประโยคที่เขียนมาแล้ว เพื่อให้เทิร์นถัด ๆ ไปตรงกัน"""
        for p in PRONOUNS:
            if text.startswith(p):
                return (p, "ค่ะ" if p in ("หนู", "ดิฉัน") or "ค่ะ" in text else "ครับ")
        return None

    def say(self, text: str) -> str:
        for p in PRONOUNS:
            if text.startswith(p):
                text = self.pronoun + text[len(p) :]
                break
        text = re.sub(r"(ครับ|ค่ะ|คะ)\s*$", "", text).rstrip()
        if not text.endswith(("?", "ๆ")):
            text = f"{text}{self.particle}"
        return text


def pick(rng: random.Random, options: list[str], **fmt) -> str:
    return rng.choice(options).format(**fmt)


# ---------------------------------------------------------------------------
def build_conversation(rng: random.Random) -> dict:
    """สร้างบทสนทนา 1 บท พร้อม meta บอกว่ามีเคสพิเศษอะไรบ้าง"""
    name = rng.choice(NICKNAMES)
    voice = Voice(rng)
    category = rng.choice(list(EXPERIENCES))
    exp = rng.choice(EXPERIENCES[category])

    messages: list[dict] = [{"role": "system", "content": SYSTEM_SHORT}]
    tags: list[str] = []

    def a(text: str) -> None:
        messages.append({"role": "assistant", "content": text})

    def u(text: str) -> None:
        messages.append({"role": "user", "content": text})

    # ---- 1. เปิดบท: ถามชื่อ ----
    a(rng.choice(OPENINGS))

    # ---- 2. ผู้ใช้บอกชื่อ (บางทีแถมข้อมูลต้องห้ามมาด้วย) ----
    if rng.random() < 0.28:
        template, kind = rng.choice(SENSITIVE_VOLUNTEERS)
        line = template.format(name=name)
        # เทมเพลตพวกนี้เขียนสรรพนามมาแล้ว — ให้เทิร์นที่เหลือใช้ตามนั้น ไม่งั้นปนกัน
        detected = Voice.detect(line)
        if detected:
            voice = Voice(rng, forced=detected)
        u(line)
        # ตอบให้ตรงกับสิ่งที่ผู้ใช้พูดออกมาจริง ไม่ใช่ท่องรายการต้องห้ามทั้งหมด
        items = "และ".join(SENSITIVE_LABELS[k] for k in kind.split("+"))
        a(pick(rng, DEFLECT_SENSITIVE, name=name, items=items))
        tags.append(f"sensitive:{kind}")
    else:
        u(voice.say(rng.choice([f"{voice.pronoun}ชื่อ{name}", f"เรียก{name}ได้เลย", f"{name}"])))
        a(pick(rng, GREET_THEN_ASK, name=name))

    # ---- 3. ผู้ใช้เล่าประสบการณ์ (บางทีลอยมาก ต้องขุดก่อน) ----
    style = rng.choices(["vague", "terse", "direct"], weights=[0.35, 0.2, 0.45])[0]
    if style == "vague":
        u(voice.say(rng.choice(VAGUE_OPENERS)))
        a(pick(rng, PROBE_VAGUE, name=name))
        tags.append("vague_first")
    elif style == "terse":
        u(voice.say(rng.choice(TERSE_ANSWERS)))
        a(pick(rng, PROBE_VAGUE, name=name))
        tags.append("terse_first")

    u(voice.say(exp["situation"]))

    # ---- 4. ขุด STAR ที่เหลือทีละอัน ----
    remaining = [
        (PROBE_TASK, exp["task"]),
        (PROBE_ACTION, exp["action"]),
        (PROBE_RESULT, exp["result"]),
    ]
    # บางบทถามย้ำสถานการณ์ก่อน
    if rng.random() < 0.3:
        remaining.insert(0, (PROBE_SITUATION, exp["situation"] + " ตอนนั้นทำกันอยู่ประมาณ 2 เดือน"))

    # แทรกคำถามนอกเรื่อง 2 ประเภทแยกกัน อย่างละไม่เกิน 1 ครั้งต่อบท
    #
    # อัตราสูงกว่าเดิมเยอะ (เดิม 0.18 รวมกัน) เพราะรอบที่แล้วโมเดลเรียนไม่พอ
    # ตอน eval มันข้ามคำขอไปเฉย ๆ ไม่ปฏิเสธ ได้ deflect แค่ 50%
    #
    # และโครงคำตอบต้องเป็น "ปฏิเสธก่อน -> ดึงกลับ -> ถามต่อ" เสมอ
    # ห้ามสลับลำดับ ไม่งั้นโมเดลจะเรียนว่าส่วนปฏิเสธเป็นของแถมที่ตัดทิ้งได้
    # ตัดสินใจ "ต่อบทสนทนา" ไม่ใช่ต่อคำถาม
    # ถ้าสุ่มทุกคำถาม STAR (3-4 ครั้ง) โอกาสจะทบกันจนได้ 81% ของบททั้งหมด
    # ซึ่งมากเกินไป โมเดลจะเรียนว่า "ต้องปฏิเสธบ่อย ๆ" แล้วเผลอปฏิเสธคำถามปกติด้วย
    want_outcome = rng.random() < 0.35
    want_chitchat = rng.random() < 0.25
    did_outcome = did_chitchat = False

    for probes, answer in remaining:
        a(pick(rng, probes, name=name))

        if want_outcome and not did_outcome and rng.random() < 0.5:
            u(rng.choice(OUTCOME_QUESTIONS))
            a(
                pick(rng, DEFLECT_OUTCOME, name=name)
                + "\n"
                + pick(rng, STEER_BACK, name=name)
                + "\n"
                + pick(rng, probes, name=name)
            )
            did_outcome = True
            tags.append("outcome_question")

        elif want_chitchat and not did_chitchat and rng.random() < 0.5:
            u(rng.choice(CHITCHAT_QUESTIONS))
            a(
                pick(rng, DEFLECT_CHITCHAT, name=name)
                + "\n"
                + pick(rng, STEER_BACK, name=name)
                + "\n"
                + pick(rng, probes, name=name)
            )
            did_chitchat = True
            tags.append("chitchat")

        u(voice.say(answer))

    # ---- 5. สรุปปิดท้าย ----
    skills = " · ".join(exp["skills"])
    a(pick(rng, WRAP_UP, name=name, skills=skills))

    return {
        "messages": messages,
        "meta": {"category": category, "name": name, "tags": tags, "n_turns": len(messages) - 1},
    }


# ---------------------------------------------------------------------------
def validate(conv: dict) -> list[str]:
    """
    ตรวจว่าฝั่งผู้ช่วยไม่ได้ละเมิดกติกา

    สำคัญมาก: ถ้าข้อมูลเทรนมีตัวอย่างที่ผู้ช่วยถามเกรด แม้แค่ไม่กี่บท
    โมเดลจะเรียนรู้ว่า "บางครั้งถามได้" แล้วมันจะโผล่มาตอน demo แน่นอน
    """
    problems = []
    msgs = conv["messages"]

    for i, m in enumerate(msgs):
        if m["role"] != "assistant":
            continue
        text = m["content"]

        # ถามคำต้องห้าม = ผิด แต่ถ้าเป็นประโยคปฏิเสธ ("ขอไม่นำ...มาใช้") = ถูก
        for word in FORBIDDEN_IN_QUESTION:
            if word in text:
                refusing = any(
                    k in text for k in ["ไม่นำ", "ไม่เก็บ", "ขอข้าม", "ไม่ได้ดู", "ขอไม่"]
                )
                if not refusing:
                    problems.append(f"[{i}] ผู้ช่วยพูดถึง '{word}' โดยไม่ได้ปฏิเสธ")

        if text.count("?") > 1:
            problems.append(f"[{i}] มีเครื่องหมายคำถามมากกว่า 1 อัน — ผิดกติกาถามทีละคำถาม")

        if len(text) > 420:
            problems.append(f"[{i}] ยาวเกินไป ({len(text)} ตัวอักษร)")

    # ทุกครั้งที่ผู้ใช้ถามนอกเรื่อง เทิร์นถัดไปของผู้ช่วยต้อง "ปฏิเสธ" จริง ๆ
    #
    # กันไว้เพราะรอบที่แล้วพลาดตรงนี้: มีเทมเพลตหนึ่งที่ขึ้นต้นด้วยการดึงกลับ
    # แล้วปฏิเสธอ่อน ๆ ท้ายประโยค โมเดลเลยเรียนว่าตัดส่วนปฏิเสธทิ้งได้
    # ผลคือตอน eval มันข้ามคำขอไปเฉย ๆ ได้ deflect แค่ 50%
    off_topic_all = set(OUTCOME_QUESTIONS) | set(CHITCHAT_QUESTIONS)
    refusal_markers = ["ไม่ได้", "ขอไม่", "ขอข้าม", "ไม่ใช่หน้าที่", "ช่วยไม่ได้"]
    for i, m in enumerate(msgs[:-1]):
        if m["role"] == "user" and m["content"] in off_topic_all:
            reply = msgs[i + 1]["content"]
            if not any(k in reply for k in refusal_markers):
                problems.append(f"[{i+1}] ผู้ใช้ถามนอกเรื่อง แต่ผู้ช่วยไม่ได้ปฏิเสธ")
            # ต้องปฏิเสธก่อน ไม่ใช่ต่อท้าย — ดูจากบรรทัดแรก
            elif not any(k in reply.split("\n")[0] for k in refusal_markers):
                problems.append(f"[{i+1}] ปฏิเสธอยู่ท้ายเกินไป ต้องขึ้นต้นด้วยการปฏิเสธ")

    if msgs[-1]["role"] != "assistant":
        problems.append("บทสนทนาต้องจบที่ฝั่งผู้ช่วย")

    roles = [m["role"] for m in msgs[1:]]
    for a, b in zip(roles, roles[1:], strict=False):
        if a == b:
            problems.append(f"บทบาทซ้ำติดกัน: {a}")
            break

    return problems


# ---------------------------------------------------------------------------
async def paraphrase_all(convs: list[dict], keep_ratio: float = 0.5) -> int:
    """
    ให้ Typhoon เกลาสำนวนฝั่งผู้ใช้ให้เป็นธรรมชาติขึ้น (ฝั่งผู้ช่วยไม่แตะ)

    เกลาเฉพาะฝั่งผู้ใช้เพราะฝั่งผู้ช่วยคือ "คำตอบที่ถูก" ที่เราจงใจเขียนไว้
    ถ้าปล่อยให้ LLM เขียนใหม่ มันอาจเผลอใส่คำถามเรื่องเกรดกลับเข้ามา
    """
    from ai.llm.base import Message, build_provider
    from app.config import get_settings

    provider = build_provider(get_settings())
    n_done = 0

    for conv in convs:
        if random.random() > keep_ratio:
            continue
        for m in conv["messages"]:
            if m["role"] != "user" or len(m["content"]) < 25:
                continue
            try:
                new = await provider.chat(
                    [
                        Message(
                            role="user",
                            content=(
                                "เขียนประโยคนี้ใหม่ให้เป็นภาษาพูดที่เป็นธรรมชาติขึ้น "
                                "คงความหมาย ตัวเลข และชื่อเครื่องมือไว้ครบทุกตัว "
                                "ตอบกลับมาเป็นประโยคเดียว ไม่ต้องอธิบาย:\n\n" + m["content"]
                            ),
                        )
                    ],
                    temperature=0.8,
                    max_tokens=200,
                )
                if new and len(new) < len(m["content"]) * 2.5:
                    m["content"] = new.strip().strip('"')
                    n_done += 1
            except Exception:  # noqa: BLE001 — เกลาไม่ได้ก็ใช้ของเดิม ไม่ใช่เรื่องคอขาดบาดตาย
                continue

    return n_done


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=1200, help="จำนวนบทสนทนา")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--paraphrase", action="store_true", help="เกลาสำนวนด้วย Typhoon (ต้องมี API key)")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    print(f"สร้างบทสนทนา {args.n:,} บท · seed {args.seed}\n")

    convs: list[dict] = []
    seen: set[str] = set()
    rejected = 0
    stalls = 0

    while len(convs) < args.n and stalls < 2000:
        conv = build_conversation(rng)

        problems = validate(conv)
        if problems:
            rejected += 1
            if rejected <= 3:
                print(f"  ทิ้ง 1 บท: {problems[0]}")
            continue

        fingerprint = "|".join(m["content"] for m in conv["messages"])
        if fingerprint in seen:
            stalls += 1
            continue
        seen.add(fingerprint)
        stalls = 0
        convs.append(conv)

    if args.paraphrase:
        import asyncio

        print("\nกำลังเกลาสำนวนฝั่งผู้ใช้ด้วย Typhoon ...")
        n = asyncio.run(paraphrase_all(convs))
        print(f"  เกลาแล้ว {n} ประโยค")

        before = len(convs)
        convs = [c for c in convs if not validate(c)]
        if before != len(convs):
            print(f"  ⚠ ทิ้ง {before - len(convs)} บทที่เกลาแล้วผิดกติกา")

    # ---- แบ่งและเขียน ----
    rng.shuffle(convs)
    n_tr, n_dev = int(len(convs) * 0.8), int(len(convs) * 0.1)
    parts = {
        "train": convs[:n_tr],
        "dev": convs[n_tr : n_tr + n_dev],
        "test": convs[n_tr + n_dev :],
    }

    run_id = f"{args.n}-seed{args.seed}-{datetime.now():%Y%m%d-%H%M%S}"
    out_dir = OUT_ROOT / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    for split_name, rows in parts.items():
        with (out_dir / f"{split_name}.jsonl").open("w", encoding="utf-8") as fh:
            for c in rows:
                fh.write(json.dumps(c, ensure_ascii=False) + "\n")

    # ---- สถิติ ----
    import collections

    tag_counts = collections.Counter(t.split(":")[0] for c in convs for t in c["meta"]["tags"])
    turn_counts = [c["meta"]["n_turns"] for c in convs]
    cat_counts = collections.Counter(c["meta"]["category"] for c in convs)

    manifest = {
        "run_id": run_id,
        "created_at": datetime.now().isoformat(),
        "seed": args.seed,
        "n_total": len(convs),
        "splits": {k: len(v) for k, v in parts.items()},
        "rejected_by_validator": rejected,
        "avg_turns": round(sum(turn_counts) / max(len(turn_counts), 1), 1),
        "tag_counts": dict(tag_counts),
        "categories": dict(cat_counts),
        "paraphrased": args.paraphrase,
        "system_prompt": SYSTEM_SHORT,
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 62)
    print(f"เขียนแล้วที่: {out_dir}")
    for k, v in parts.items():
        print(f"  {k+'.jsonl':<14} {len(v):>6,} บท")
    print(f"\n  เฉลี่ย {manifest['avg_turns']} เทิร์นต่อบท · สายอาชีพ {len(cat_counts)} หมวด")
    print(f"  ทิ้งเพราะผิดกติกา {rejected} บท")
    print("\n  เคสพิเศษที่สอนโมเดล:")
    for k, v in tag_counts.most_common():
        pct = v / max(len(convs), 1) * 100
        print(f"    {k:<18} {v:>5,} บท ({pct:.0f}%)")
    print("=" * 62)
    print(f"\nขั้นต่อไป: python train/train_interview_lora.py --data {out_dir.name}")


if __name__ == "__main__":
    main()
