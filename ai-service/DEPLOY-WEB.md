# เอาขึ้นเว็บจริง — ต้องทำอะไรบ้าง

## ปัญหาหลักที่ต้องตัดสินใจก่อนลงมือ

ผลวัดล่าสุด (11 สถานการณ์ x หลายรอบ):

| setup | คะแนน |
|---|---|
| **fine-tuned + prompt ยาว** | **88%** ← ดีที่สุด |
| fine-tuned + prompt สั้น | 79% |
| base (4B) + prompt ยาว | 30% |
| base (4B) + prompt สั้น | 18% |

วัดผ่าน API จริงอีกรอบได้ **91%** — ชั้นเสิร์ฟไม่ได้ทำคะแนนตก

**แต่โมเดลที่ fine-tune ต้องใช้ GPU** และ Vercel กับ Railway/Render ฟรีไม่มี GPU
นี่คือข้อจำกัดที่บังคับให้ต้องเลือกทาง

---

## 3 ทางเลือก

| ทาง | โมเดลที่ใช้ | คะแนน | ค่าใช้จ่าย | เหมาะกับ |
|---|---|---|---|---|
| **A. Tunnel จากโน้ตบุ๊ก** | fine-tuned ของเรา | 91% | ฟรี | **Demo Day** |
| **B. Typhoon API** | typhoon-v2.5-30b (ของ SCB10X) | **ยังไม่วัด** | ฟรี/ถูก | เว็บที่เปิดตลอด |
| **C. เช่า GPU** | fine-tuned ของเรา | 91% | ~$0.5/ชม.ขึ้นไป | ถ้าจะทำต่อจริง |

### ⚠ ตัวเลข 30% ไม่ใช่คะแนนของ Typhoon API

ต้องเข้าใจให้ตรงกัน — `base + prompt ยาว = 30%` วัดจาก **`scb10x/typhoon2.5-qwen3-4b` ที่รันในเครื่อง (4 พันล้านพารามิเตอร์)**

แต่ Typhoon API เสิร์ฟ **`typhoon-v2.5-30b-a3b-instruct` (30 พันล้าน)** ซึ่งเป็นคนละตัว ใหญ่กว่า 7 เท่า
โมเดลใหญ่ทำตาม prompt ยาวได้ดีกว่ามาก **เราไม่เคยวัดเส้นทางนี้เลยสักครั้ง**

**ห้ามตัดสินใจจากเลข 30% เด็ดขาด** ต้องวัดก่อน ใช้เวลา 5 นาที:

```powershell
# 1. แก้ .env
#    LLM_PROVIDER=typhoon_api
# 2. รีสตาร์ท uvicorn
# 3. วัด
python scripts\chat_cli.py --probe --runs 2
```

ถ้าออกมาสูง (เช่น 80%+) ให้ใช้ทาง B เลย เพราะดูแลง่ายกว่าเยอะ
ถ้าออกมาต่ำ ค่อยไปทาง A

---

## ทาง A — Tunnel จากโน้ตบุ๊ก (แนะนำสำหรับ Demo Day)

เปิด server ในเครื่อง แล้วเปิดพอร์ตออกอินเทอร์เน็ตให้ Vercel เรียกได้

### ติดตั้ง cloudflared (ฟรี ไม่ต้องสมัคร)

```powershell
winget install --id Cloudflare.cloudflared
```

### เปิด server + tunnel

```powershell
# แท็บ 1
$env:PYTHONIOENCODING = "utf-8"
uvicorn app.main:app --port 8000

# แท็บ 2
cloudflared tunnel --url http://localhost:8000
```

จะได้ URL แบบ `https://xxxx-yyyy.trycloudflare.com` เอาไปใส่ใน frontend

### ต้องเพิ่ม URL นั้นใน CORS

แก้ `.env` แล้วรีสตาร์ท:

```
CORS_ORIGINS=http://localhost:5173,https://khontongpok.vercel.app,https://xxxx-yyyy.trycloudflare.com
```

> URL ของ cloudflared เปลี่ยนทุกครั้งที่รันใหม่ — **อย่ารันใหม่ตอนใกล้ขึ้นเวที**
> เปิดทิ้งไว้ตั้งแต่ก่อนเริ่มงาน แล้วเช็คว่ายังตอบอยู่ด้วย `--health`

---

## ทาง B — Typhoon API (ถ้าวัดแล้วผ่าน)

ง่ายที่สุด เพราะไม่ต้องมี GPU เลย deploy ที่ไหนก็ได้

```
LLM_PROVIDER=typhoon_api
TYPHOON_API_KEY=<key ของคุณ>
```

deploy backend ขึ้น Railway หรือ Render (ฟรี):

```powershell
# ต้องมี Procfile หรือตั้ง start command เป็น
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**ข้อควรรู้:** ทางนี้ไม่ได้ใช้โมเดลที่เรา fine-tune เอง
แต่ยังพูดตอน pitch ได้ว่า *"เรา fine-tune โมเดลเอง ได้ 88% เทียบกับ prompt เปล่า 30%"*
แล้วโชว์ demo สดด้วยทาง A — ตัวเลขกับ demo เป็นคนละเรื่องกัน ไม่ได้โกหกอะไร

---

## สิ่งที่ frontend ต้องแก้

หน้าเว็บตอนนี้ยัง mock อยู่ทั้งหมด ต้องแก้ 3 จุด

### 1. หน้า `/decoder` — แชทน้องตรงปก

ตอนนี้คำตอบเป็น hardcode (เอาข้อความผู้ใช้ทั้งประโยคไปเสียบเป็นชื่อ)
ต้องเปลี่ยนเป็นเรียก API:

```ts
const API = import.meta.env.VITE_API_URL;   // หรือ process.env.NEXT_PUBLIC_API_URL

async function sendMessage(sessionId: string, messages: Msg[]) {
  const res = await fetch(`${API}/api/interview/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.reply as string;
}
```

**อย่าส่ง system prompt จากฝั่ง frontend** — server ใส่ให้เอง
ถ้าให้ client ส่งได้ ใครก็เปิด DevTools แล้วแก้กติกา "ห้ามถาม GPA" ทิ้งได้

ข้อความเปิดบทดึงจาก `GET /api/interview/opening`

### 2. อัปโหลดเรซูเม่ PDF

```ts
const form = new FormData();
form.append('file', file);
const res = await fetch(`${API}/api/decoder/resume`, { method: 'POST', body: form });
const { spans, trained, note } = await res.json();
```

`spans` มี `char_start` / `char_end` — เอาไปไฮไลต์ทับข้อความต้นฉบับได้เลย
**อันนี้คือ demo moment ที่พิสูจน์คำว่า "ตรงปก"** กดทักษะแล้วเด้งไปที่ประโยคต้นทาง

> ตอนนี้ `trained: false` เพราะยังไม่ได้ fine-tune ตัวสกัดทักษะ (ยังไม่มี label)
> UI ควรเช็คแล้วขึ้นข้อความว่า "กำลังพัฒนา" แทนที่จะโชว์ว่างเปล่า

### 3. เกม — แก้บรรทัดเดียว

`frontend/src/shared/telemetry.ts` ของพี่ฟรองมี TODO ค้างอยู่:

```ts
await sendPayload(payload, `${API}/api/assessment/game`);
```

ยิงครบ 4 เกมแล้วขอ radar:

```ts
const radar = await fetch(`${API}/api/assessment/session/${sessionId}/radar`).then(r => r.json());
// radar.axes = 6 แกน 0-100
```

---

## เช็คลิสต์ก่อน Demo Day

- [ ] วัด Typhoon API ด้วย `--probe` แล้วตัดสินใจว่าจะใช้ทาง A หรือ B
- [ ] ใส่ URL ของ backend ใน CORS_ORIGINS แล้วรีสตาร์ท
- [ ] frontend ต่อครบ 3 จุด (แชท / อัปโหลด PDF / เกม)
- [ ] `python scripts\chat_cli.py --health` ก่อนขึ้นเวที 10 นาที
- [ ] warm up โมเดล — ยิงแชท 1 ครั้งให้มันโหลดเสร็จก่อน ไม่งั้นคำตอบแรกช้ามาก
- [ ] **อัดวิดีโอ flow ที่สมบูรณ์ไว้** เผื่อเน็ตงานล่ม
- [ ] เตรียม `LLM_PROVIDER=typhoon_api` ไว้เป็นแผนสำรอง สลับได้ใน 30 วินาที

---

## ลำดับที่ควรทำ

1. **วัด Typhoon API ก่อน** (5 นาที) — ตัดสินใจด้วยข้อมูล ไม่ใช่ความรู้สึก
2. บอกพี่ฟรองแก้ `telemetry.ts` 1 บรรทัด — เกมต่อได้ทันที เป็นชิ้นที่ง่ายที่สุด
3. ต่อหน้า `/decoder` เข้ากับ API
4. ตั้ง tunnel แล้วทดสอบจาก Vercel จริง
5. ซ้อม demo แบบ end-to-end 5 รอบ จับเวลา
