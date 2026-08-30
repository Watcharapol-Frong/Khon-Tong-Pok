"""
คุยกับน้องตรงปกผ่าน API จริง — ใช้เทสหลังใส่โมเดลแล้ว

    python scripts/chat_cli.py              # คุยแบบโต้ตอบ
    python scripts/chat_cli.py --probe      # ยิงชุดทดสอบผ่าน API แล้วให้คะแนน
    python scripts/chat_cli.py --health     # เช็คว่าเสิร์ฟด้วยอะไรอยู่

--------------------------------------------------------------------------
ทำไมต้องมีตัวนี้ ทั้งที่มี eval_interview.py แล้ว

eval_interview.py โหลดโมเดลขึ้นมาเองในโปรเซสเดียวกัน = ทดสอบ "ตัวโมเดล"
ตัวนี้ยิงผ่าน HTTP ไปที่ API จริง = ทดสอบ "ระบบที่ผู้ใช้จะเจอ"

สองอย่างนี้พังคนละแบบ และ eval จับแบบหลังไม่ได้เลย:
  - ตั้ง HF_LORA_ADAPTER แล้วแต่ลืมรีสตาร์ท server -> ยังเสิร์ฟ base อยู่
  - chat template ตอนเสิร์ฟไม่ตรงกับตอนเทรน -> คุณภาพตกเงียบ ๆ
  - system prompt ฝั่ง server ต่างจากตอน eval
  - โมเดลโหลดไม่ขึ้นเพราะ VRAM ไม่พอ แล้ว fallback ไปทางอื่น

เคยเจอมาแล้วในโปรเจกต์นี้: eval บอก 82% แต่ยังไม่เคยมีใครลองคุยจริงสักครั้ง
--------------------------------------------------------------------------
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from train.eval_interview import PROBES, count_questions, judge  # noqa: E402

DEFAULT_API = "http://localhost:8000"


# ---------------------------------------------------------------------------
def check_health(api: str) -> dict | None:
    try:
        r = httpx.get(f"{api}/api/interview/health", timeout=180)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        print(f"ต่อ {api} ไม่ได้ — เปิด server ก่อนครับ:\n")
        print("  uvicorn app.main:app --reload --port 8000\n")
        return None
    except httpx.HTTPStatusError as exc:
        print(f"server ตอบ {exc.response.status_code}: {exc.response.text[:300]}")
        return None
    except httpx.ReadTimeout:
        print("server ไม่ตอบใน 3 นาที — ถ้าใช้ hf_local รอบแรกต้องโหลดโมเดลก่อน ลองใหม่อีกที")
        return None


def print_health(h: dict) -> None:
    print("=" * 60)
    print(f"  สถานะ        {h['status']}")
    print(f"  provider     {h['llmProvider']}")
    print(f"  โมเดล        {h['llmModel']}")
    print(f"  ต่อได้ไหม     {'ได้' if h['llmReachable'] else 'ไม่ได้'}")
    print(f"  ตัวสกัดทักษะ  {h['skillModel']}")
    print(f"  fine-tune แล้ว {'แล้ว' if h['skillModelTrained'] else 'ยัง'}")
    print("=" * 60)

    # เตือนถ้าตั้ง adapter ไว้แต่ provider ไม่ได้ใช้มัน
    if "lora" not in h["llmProvider"] and "hf_local" not in h["llmProvider"]:
        print(
            "\n⚠ ตอนนี้ไม่ได้เสิร์ฟด้วยโมเดลที่ fine-tune เอง\n"
            "  ถ้าอยากเทสตัวที่เทรนแล้ว ตั้งใน .env:\n"
            "     LLM_PROVIDER=hf_local\n"
            "     HF_LORA_ADAPTER=./models/<ชื่อ adapter>\n"
            "  แล้ว **รีสตาร์ท uvicorn** (แก้ .env เฉย ๆ ไม่พอ)\n"
        )
    elif "+lora" in h["llmProvider"]:
        print("\n✓ กำลังเสิร์ฟด้วย LoRA adapter ที่ fine-tune เอง\n")


def send(api: str, session: str, history: list[dict]) -> dict:
    r = httpx.post(
        f"{api}/api/interview/chat",
        json={"sessionId": session, "messages": history},
        timeout=300,
    )
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
def flag_issues(reply: str) -> list[str]:
    """เตือนสด ๆ ระหว่างคุยว่าคำตอบนี้ผิดกติกาตรงไหน"""
    from train.eval_interview import PROFANITY_RE, REFUSAL_MARKERS, SENSITIVE_WORDS

    issues = []
    n_q = count_questions(reply)
    if n_q > 1:
        issues.append(f"ถาม {n_q} คำถามในเทิร์นเดียว")
    if len(reply) > 500:
        issues.append(f"ยาว {len(reply)} ตัวอักษร (เกิน 500)")
    if PROFANITY_RE.search(reply):
        issues.append("มีคำหยาบ")

    hit = [w for w in SENSITIVE_WORDS if w in reply]
    if hit and not any(m in reply for m in REFUSAL_MARKERS):
        issues.append(f"พูดถึง {'/'.join(hit)} โดยไม่ได้ปฏิเสธ")

    return issues


def interactive(api: str) -> None:
    session = f"cli-{uuid.uuid4().hex[:8]}"
    history: list[dict] = []

    try:
        opening = httpx.get(f"{api}/api/interview/opening", timeout=60).json()["reply"]
    except Exception:  # noqa: BLE001
        opening = "สวัสดีครับ ผมน้องตรงปกครับ"

    print(f"\nน้องตรงปก: {opening}\n")
    history.append({"role": "assistant", "content": opening})

    print("พิมพ์คุยได้เลย · /reset เริ่มใหม่ · /transcript ดูบทสนทนา · /skills สกัดทักษะ · /q ออก\n")

    while True:
        try:
            text = input("คุณ: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return

        if not text:
            continue
        if text in ("/q", "/quit", "/exit"):
            return
        if text == "/reset":
            history = [{"role": "assistant", "content": opening}]
            print("\n-- เริ่มบทสนทนาใหม่ --\n")
            continue
        if text == "/transcript":
            print()
            for m in history:
                who = "คุณ" if m["role"] == "user" else "น้องตรงปก"
                print(f"  {who}: {m['content']}")
            print()
            continue
        if text == "/skills":
            run_extract(api, history)
            continue

        history.append({"role": "user", "content": text})
        try:
            res = send(api, session, history)
        except httpx.HTTPStatusError as exc:
            detail = exc.response.json().get("detail", exc.response.text)
            print(f"\n  [server ตอบ {exc.response.status_code}] {detail}\n")
            history.pop()
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"\n  [ยิงไม่สำเร็จ] {type(exc).__name__}: {exc}\n")
            history.pop()
            continue

        reply = res["reply"]
        history.append({"role": "assistant", "content": reply})

        print(f"\nน้องตรงปก: {reply}")
        for issue in flag_issues(reply):
            print(f"   ⚠ {issue}")
        print()


def run_extract(api: str, history: list[dict]) -> None:
    """เอาบทสนทนาไปเข้าชั้น A ดูว่าสกัดทักษะอะไรได้บ้าง"""
    user_text = "\n".join(m["content"] for m in history if m["role"] == "user")
    if not user_text.strip():
        print("\n  ยังไม่มีอะไรให้สกัด คุยก่อนครับ\n")
        return

    try:
        r = httpx.post(f"{api}/api/decoder/extract", json={"text": user_text}, timeout=180)
        r.raise_for_status()
        data = r.json()
    except Exception as exc:  # noqa: BLE001
        print(f"\n  [สกัดไม่สำเร็จ] {exc}\n")
        return

    print(f"\n  โมเดล: {data['modelVersion']} (fine-tune แล้ว: {data['trained']})")
    if data.get("note"):
        print(f"  หมายเหตุ: {data['note']}")
    if not data["spans"]:
        print("  ยังสกัดทักษะไม่ได้\n")
        return
    for s in data["spans"]:
        print(f"    [{s['label']:<5}] {s['surface_text']}  ({s['confidence']:.2f})")
    print()


# ---------------------------------------------------------------------------
def run_probes(api: str, runs: int) -> None:
    """ยิงชุดทดสอบเดียวกับ eval_interview.py แต่ผ่าน API จริง"""
    session = f"probe-{uuid.uuid4().hex[:8]}"
    results: list[dict] = []

    print(f"ยิง {len(PROBES)} สถานการณ์ x {runs} รอบ ผ่าน {api}\n")

    for probe in PROBES:
        passed = 0
        for _ in range(runs):
            try:
                reply = send(api, session, probe.history)["reply"]
            except Exception as exc:  # noqa: BLE001
                print(f"  ✗ {probe.name:<34} ยิงไม่สำเร็จ: {type(exc).__name__}")
                reply = ""
            ok = judge(probe, reply) if reply else False
            passed += ok
            results.append({"probe": probe.name, "check": probe.check,
                            "passed": ok, "reply": reply})
        mark = "✓" if passed == runs else ("~" if passed else "✗")
        print(f"  {mark} {probe.name:<34} {passed}/{runs}")

    print()
    checks: dict[str, list[bool]] = {}
    for r in results:
        checks.setdefault(r["check"], []).append(r["passed"])

    names = {
        "sensitive": "ไม่แตะข้อมูลต้องห้าม",
        "probe_vague": "ขุดต่อเมื่อตอบลอย",
        "deflect": "ไม่รับปากเรื่องผลลัพธ์",
        "one_question": "ถามทีละคำถาม",
        "off_topic": "ไม่หลุดไปเรื่องอื่น",
    }
    print("=" * 52)
    for c, vals in checks.items():
        print(f"  {names.get(c, c):<26} {sum(vals)}/{len(vals)}  {sum(vals)/len(vals)*100:>5.0f}%")
    total = [v for vals in checks.values() for v in vals]
    print("-" * 52)
    print(f"  {'รวม':<26} {sum(total)}/{len(total)}  {sum(total)/len(total)*100:>5.0f}%")
    print("=" * 52)

    print(
        "\nถ้าตัวเลขนี้ต่ำกว่าที่ eval_interview.py วัดไว้มาก\n"
        "  แปลว่าปัญหาอยู่ที่ชั้นเสิร์ฟ ไม่ใช่ตัวโมเดล — เช็ค 3 อย่าง:\n"
        "    1. รีสตาร์ท uvicorn หลังแก้ .env แล้วหรือยัง\n"
        "    2. /api/interview/health บอกว่าเสิร์ฟด้วย provider อะไร\n"
        "    3. system prompt ฝั่ง server (ai/llm/prompts.py) ตรงกับตอนเทรนไหม"
    )

    fails = [r for r in results if not r["passed"] and r["reply"]]
    if fails:
        print(f"\nตัวอย่างคำตอบที่ตก ({len(fails)} อัน):\n")
        for r in fails[:5]:
            print(f"  [{r['check']}] {r['probe']}")
            print(f"    {r['reply'][:200]}\n")

    # เซฟคำตอบดิบไว้ — generate ครั้งนึงใช้เวลาเป็นนาที
    # ถ้าแก้ judge แล้วอยากรู้ว่าคะแนนเปลี่ยนไหม ให้ rescore จากไฟล์นี้
    # ไม่ต้องรันโมเดลใหม่ (ดู --rescore)
    out = Path("models/probe_api_results.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"api": api, "runs": runs, "results": results},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nเซฟคำตอบดิบไว้ที่ {out} (ใช้ --rescore ให้คะแนนใหม่ได้โดยไม่ต้องรันโมเดล)")


def rescore(path: str) -> None:
    """ให้คะแนนผลเดิมใหม่ด้วย judge ปัจจุบัน — ไม่ต้องเรียกโมเดลเลย"""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    by_name = {p.name: p for p in PROBES}

    # รองรับ 2 รูปแบบไฟล์:
    #   chat_cli --probe      -> {"results": [...]}            (setup เดียว)
    #   eval_interview.py     -> {"setups": [{"results": [...]}]} (หลาย setup)
    if "setups" in data:
        print(f"ให้คะแนนใหม่จาก {path} — เทียบทุก setup\n")
        print(f'{"setup":<30}{"เดิม":>10}{"ใหม่":>12}')
        print("-" * 54)
        for s in data["setups"]:
            new = [
                judge(by_name[r["probe"]], r["reply"]) if r["probe"] in by_name else r["passed"]
                for r in s["results"]
            ]
            print(f'{s["label"]:<30}{s["overall"]:>9.0f}%{sum(new)/len(new)*100:>11.0f}%')
        print("-" * 54)
        return

    checks: dict[str, list[bool]] = {}
    changed = 0
    for r in data["results"]:
        probe = by_name.get(r["probe"])
        new = judge(probe, r["reply"]) if probe and r["reply"] else False
        changed += new != r["passed"]
        checks.setdefault(r["check"], []).append(new)

    names = {
        "sensitive": "ไม่แตะข้อมูลต้องห้าม",
        "probe_vague": "ขุดต่อเมื่อตอบลอย",
        "deflect": "ไม่รับปากเรื่องผลลัพธ์",
        "one_question": "ถามทีละคำถาม",
        "off_topic": "ไม่หลุดไปเรื่องอื่น",
    }
    print(f"ให้คะแนนใหม่จาก {path}  (ผลเปลี่ยน {changed} อัน)\n")
    print("=" * 52)
    for c, vals in checks.items():
        print(f"  {names.get(c, c):<26} {sum(vals)}/{len(vals)}  {sum(vals)/len(vals)*100:>5.0f}%")
    total = [v for vals in checks.values() for v in vals]
    print("-" * 52)
    print(f"  {'รวม':<26} {sum(total)}/{len(total)}  {sum(total)/len(total)*100:>5.0f}%")
    print("=" * 52)


# ---------------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default=DEFAULT_API)
    ap.add_argument("--probe", action="store_true", help="ยิงชุดทดสอบแทนการคุย")
    ap.add_argument("--health", action="store_true", help="เช็คว่าเสิร์ฟด้วยอะไร แล้วออก")
    ap.add_argument("--runs", type=int, default=2, help="ยิงกี่รอบต่อสถานการณ์ (โหมด probe)")
    ap.add_argument("--rescore", metavar="FILE", nargs="?", const="models/probe_api_results.json",
                    help="ให้คะแนนผลเดิมใหม่ด้วย judge ปัจจุบัน ไม่ต้องรันโมเดล")
    args = ap.parse_args()

    # rescore ไม่ต้องใช้ server เลย
    if args.rescore:
        rescore(args.rescore)
        return

    health = check_health(args.api)
    if health is None:
        raise SystemExit(1)
    print_health(health)

    if args.health:
        return
    if not health["llmReachable"]:
        raise SystemExit(
            "LLM ต่อไม่ได้ — เทสไม่ได้ครับ\n"
            "  typhoon_api: เช็ค TYPHOON_API_KEY ใน .env\n"
            "  hf_local:    เช็คว่าโมเดลโหลดขึ้นไหม (ดู log ของ uvicorn)"
        )

    if args.probe:
        run_probes(args.api, args.runs)
    else:
        interactive(args.api)


if __name__ == "__main__":
    main()
