# คู่มือฉบับ Windows Terminal (PowerShell)

ทุกคำสั่งในไฟล์นี้ก๊อปวางลง **Windows Terminal / PowerShell** ได้เลย
ถ้าใครใช้ Git Bash ให้ดู [RUNBOOK.md](RUNBOOK.md) แทน

> **PowerShell ไม่ใช่ bash** ต่างกันจริงจัง 3 เรื่องที่ทำคนสะดุดบ่อยสุด:
> `&&` ใช้ไม่ได้ · `curl` ไม่ใช่ curl จริง · `rm -rf` ไม่มี
> มีตารางเทียบให้ท้ายไฟล์

---

## 0. เปิดเครื่องมาแล้วทำอะไรก่อน

เปิด Windows Terminal แล้วรัน 3 บรรทัดนี้ **ทุกครั้งที่เปิด terminal ใหม่**

```powershell
cd C:\Users\User\generation_hack\ai-service
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

**ต้องมีทั้งสองบรรทัด** เพราะแก้คนละปัญหา:
- `$env:PYTHONIOENCODING` — ให้ Python **เขียน** ภาษาไทยออกมาได้ (ไม่งั้น `UnicodeEncodeError`)
- `[Console]::OutputEncoding` — ให้ console **แสดง** ภาษาไทยถูก (ไม่งั้นได้ `à¸„à¸¸à¸“` แทน `คุณ`)

### ตั้งให้ถาวร (แนะนำ ทำครั้งเดียวจบ)

```powershell
[Environment]::SetEnvironmentVariable("PYTHONIOENCODING", "utf-8", "User")
```

ส่วน `[Console]::OutputEncoding` ตั้งถาวรไม่ได้ ต้องใส่ใน PowerShell profile:

```powershell
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }
Add-Content $PROFILE '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8'
```

ตั้งแล้ว **ปิด Terminal เปิดใหม่** ถึงจะมีผล เช็คว่าติดไหม:

```powershell
$env:PYTHONIOENCODING
[Console]::OutputEncoding.EncodingName
```

> ### ⚠️ อ่านไฟล์ภาษาไทยต้องใส่ `-Encoding UTF8` เสมอ
>
> `Get-Content` ของ PowerShell 5.1 อ่านเป็น ANSI codepage ไม่ใช่ UTF-8
> ไฟล์ `.jsonl` และ `.md` ของเราเป็น UTF-8 หมด ถ้าลืมใส่จะได้ตัวอักษรเพี้ยน
>
> ```powershell
> Get-Content ..\data\labeled\example.md -Encoding UTF8      # ✅ ถูก
> Get-Content ..\data\labeled\example.md                     # ❌ ไทยเพี้ยน
> ```
>
> ตอนเขียนไฟล์ก็เหมือนกัน — `Out-File -Encoding utf8` หรือ `Set-Content -Encoding utf8`

### สร้าง virtual environment (ทำครั้งเดียว)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**ถ้า `Activate.ps1` ขึ้น error เรื่อง execution policy** — Windows บล็อกสคริปต์ไว้:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

ตอบ `Y` แล้วลอง activate ใหม่ (ปลอดภัย — อนุญาตเฉพาะสคริปต์ในเครื่องตัวเอง)

เวลาเปิด terminal ใหม่ทุกครั้ง ต้อง activate ก่อนเสมอ — ดูว่าติดยัง ให้สังเกต `(.venv)` หน้าบรรทัด

---

## 1. เช็คว่าทุกอย่างพร้อม

```powershell
python -m pytest tests/ -q
```

ต้องได้ `19 passed` ถ้าผ่านแปลว่าชั้น D (คะแนนเกม) ใช้งานได้แล้ว

```powershell
python train\paths.py
```

จะบอกว่าข้อมูลแต่ละชุดอยู่โฟลเดอร์ไหน มีหรือยัง

---

## 2. ⛔ เคลียร์ดิสก์ (ตอนนี้ติดอยู่ตรงนี้)

เครื่องเหลือว่าง **0.3 GB** — ไม่พอโหลดโมเดล Typhoon (~8 GB)
การเทรนตัวคุยรอบแรกล้มเพราะเหตุนี้ ไม่ใช่โค้ดผิด

### เช็คพื้นที่ว่าง

```powershell
Get-PSDrive C | Select-Object @{n='ว่าง(GB)';e={[math]::Round($_.Free/1GB,1)}}, @{n='ใช้ไป(GB)';e={[math]::Round($_.Used/1GB,1)}}
```

### ลบของที่ปลอดภัย (~4.8 GB)

```powershell
# zip ที่แตกไฟล์ไว้แล้ว ไม่ได้ใช้อีก — 2.0 GB
Remove-Item "C:\Users\User\generation_hack\data\raw\Resume_data_2.zip"

# ไฟล์โมเดลที่โหลดค้างไว้ตอนล้ม โหลดใหม่ได้ — 2.4 GB
Remove-Item "C:\Users\User\.cache\huggingface" -Recurse -Force

# cache ของ pip — 0.3 GB
Remove-Item "C:\Users\User\AppData\Local\pip\Cache" -Recurse -Force
```

### หาว่าอะไรกินที่อยู่อีก

```powershell
Get-ChildItem C:\Users\User -Directory | ForEach-Object {
    $sz = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
           Measure-Object Length -Sum).Sum
    [PSCustomObject]@{ โฟลเดอร์ = $_.Name; GB = [math]::Round($sz/1GB, 2) }
} | Sort-Object GB -Descending | Select-Object -First 12
```

รันนานหน่อย (2-5 นาที) ใจเย็น ๆ

**ต้องการว่างประมาณ 12 GB** ถึงจะเทรนตัวคุยในเครื่องได้

---

## 3. ชั้น D — คะแนนเกม (ใช้ได้เลย)

```powershell
uvicorn app.main:app --reload --port 8000
```

เปิดเบราว์เซอร์ไปที่ http://localhost:8000/docs

### ทดสอบยิง API

> ⚠️ **`curl` ใน PowerShell ไม่ใช่ curl จริง** มันเป็น alias ของ `Invoke-WebRequest`
> ซึ่งรับ argument คนละแบบ ต้องใช้ `curl.exe` หรือ `Invoke-RestMethod` แทน

**วิธีที่แนะนำ — `Invoke-RestMethod`:**

```powershell
$body = @{
    sessionId = "test1"
    gameId = "game1_bart"
    startedAt = "2026-08-25T10:00:00Z"
    completedAt = "2026-08-25T10:03:00Z"
    summaryMetrics = @{
        totalTrials = 20; explodedTrialsCount = 4; unexplodedTrialsCount = 16
        adjustedAveragePumps = 14.8; overallAveragePumps = 12.1
        totalPointsEarned = 240; averagePumpLatencyMs = 280
        postExplosionAdaptationDelta = -1.2
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/api/assessment/game" -Method Post -Body $body -ContentType "application/json"
```

**ดูคะแนน radar หลังยิงครบ 4 เกม:**

```powershell
Invoke-RestMethod "http://localhost:8000/api/assessment/session/test1/radar" | ConvertTo-Json -Depth 5
```

### บอกพี่ฟรอง

แก้ `frontend\src\shared\telemetry.ts` บรรทัดเดียว:

```ts
await sendPayload(payload, 'http://localhost:8000/api/assessment/game');
```

---

## 4. ชั้น C — น้องตรงปกที่คุยได้

### 4.1 ทางเร็ว: Typhoon API (ทำอันนี้ก่อน)

1. ขอ key ฟรีที่ https://opentyphoon.ai
2. สร้างไฟล์ `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

ใส่ `TYPHOON_API_KEY=<key ของคุณ>` แล้วเซฟ

3. รีสตาร์ท uvicorn แล้วทดสอบ:

```powershell
$chat = @{
    sessionId = "t1"
    messages = @(@{ role = "user"; content = "ผมชื่อเฟร้นครับ" })
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:8000/api/interview/chat" -Method Post -Body $chat -ContentType "application/json"
```

### 4.2 สร้างข้อมูลเทรน (ไม่ต้องมี API key)

```powershell
python train\gen_interview_data.py --n 1200
```

ดูว่าหน้าตาเป็นยังไง:

```powershell
$dir = Get-ChildItem ..\data\interview -Directory | Sort-Object LastWriteTime -Desc | Select-Object -First 1
$row = Get-Content "$($dir.FullName)\train.jsonl" -TotalCount 1 -Encoding UTF8 | ConvertFrom-Json
$row.messages | ForEach-Object { "{0,-10}: {1}" -f $_.role, $_.content.Substring(0, [Math]::Min(90, $_.content.Length)) }
```

ผลที่ควรได้:

```
system    : คุณคือ "น้องตรงปก" ผู้ช่วย AI ของแพลตฟอร์มคนตรงปก สัมภาษณ์ผู้ใช้...
assistant : สวัสดีครับ! ผมคือ น้องตรงปก 🤖 ก่อนที่เราจะเริ่มวิเคราะห์ประสบการณ์กัน...
user      : เรียกแนนได้เลยค่ะ
```

ถ้าเห็น `à¸„à¸¸à¸“` แทนภาษาไทย = ลืม `-Encoding UTF8` หรือ `[Console]::OutputEncoding`

### 4.3 เทรน QLoRA

หาชื่อโฟลเดอร์ข้อมูลล่าสุดก่อน เก็บไว้ในตัวแปร:

```powershell
$dir = (Get-ChildItem ..\data\interview -Directory | Sort-Object LastWriteTime -Desc | Select-Object -First 1).Name
$dir
```

**รันครั้งแรก — ลองสั้น ๆ ให้ครบ pipeline ก่อน (~20 นาที)**

```powershell
python train\train_interview_lora.py --data $dir --epochs 3
```

อย่าเพิ่งทุ่มหลายชั่วโมงกับรอบแรก ดูก่อนว่า loss ลง เซฟ adapter ได้ eval รันผ่าน
ถ้ารอบสั้นพัง รอบยาวก็พังเหมือนกัน แค่รู้ช้ากว่าหลายชั่วโมง

**รันจริง**

```powershell
python train\train_interview_lora.py --data $dir --epochs 5
```

#### guard กันเสียเวลา

สคริปต์จะ **หยุดก่อนโหลดโมเดล** ถ้าเห็นค่าที่น่าจะพัง แล้วบอกว่าควรใช้เท่าไหร่แทน
ที่ต้องเช็คก่อนโหลด เพราะโหลดโมเดล 4B ใช้เวลาหลายนาที ปล่อยให้ไป OOM ตอนเทรน = เสียเวลาฟรี

- `batch` ใหญ่เกิน VRAM -> คำนวณเลขที่ปลอดภัยให้
- `epochs` เกิน 10 -> เตือนเรื่อง overfit

ถ้าตั้งใจใช้ค่านั้นจริง ๆ ใส่ `--force`:

```powershell
python train\train_interview_lora.py --data $dir --epochs 60 --force
```

#### เวลาที่ใช้จริง

RTX 4050 · batch 1 x accum 16 · seq 768 · ข้อมูล 590 บท

| epochs | optimizer steps | เวลา |
|---|---|---|
| 3 | 110 | ~20 นาที |
| 5 | 184 | ~30 นาที |
| 10 | 368 | ~40-60 นาที |
| 60 | 2,212 | **3.5-6 ชั่วโมง** |

> **60 epochs ไม่คุ้มครับ**
> ข้อมูล 590 บทของเราสร้างจากเทมเพลตชุดเดียวกัน LoRA เห็นซ้ำ 60 รอบจะ
> ท่องคำตอบแทนที่จะเรียนรูปแบบ แล้วตอบไม่ฟังผู้ใช้
> 3-5 รอบพอ ถ้าอยากให้ดีขึ้นให้ **เพิ่มความหลากหลายของข้อมูล** ไม่ใช่เพิ่มรอบ
>
> early stopping ช่วยได้บ้าง แต่ metric ที่วัดคือ token accuracy ซึ่งกับข้อมูล
> เทมเพลตจะพุ่งไป ~99% เร็วมาก มันเลยไม่ค่อยจับ overfit จริง

#### seq สั้นไปทำให้ข้อมูลหาย

`--seq 768` ตัดบทที่ยาวกว่านั้นทิ้ง — ตอนนี้ทิ้งไป **370 จาก 960 บท (39%)**
และบทที่ยาวคือบทที่ขุด STAR ครบ + มีเคสพิเศษเยอะ = บทที่สอนโมเดลได้มากที่สุด

ถ้า VRAM ไหว ใช้ `--seq 1024` จะเก็บได้เกือบครบ:

```powershell
python train\train_interview_lora.py --data $dir --seq 1024 --epochs 5
```

| ปัญหา | ใส่ flag |
|---|---|
| CUDA out of memory | `--seq 768 --rank 8` |
| อยากเก็บข้อมูลให้ครบ | `--seq 1024` |
| อยากให้เร็ว | `--epochs 3` |

#### ดู GPU ระหว่างเทรน

เปิด Terminal อีกแท็บแล้วรัน:

```powershell
while ($true) { nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader; Start-Sleep 5 }
```

ถ้า memory.used ใกล้เต็มตลอด = เสี่ยง OOM ให้ลด `--seq` หรือ `--rank`

#### เทรนค้างไว้แล้วปิดหน้าจอได้

```powershell
Start-Process python -ArgumentList "train\train_interview_lora.py","--data",$dir,"--epochs","5" -RedirectStandardOutput "train.log" -RedirectStandardError "train.err" -NoNewWindow
Get-Content train.log -Wait -Encoding UTF8
```

กด `Ctrl+C` ออกจากการดู log ได้ โดยที่การเทรนยังรันต่อ

### 4.4 วัดผลก่อนใช้ — ห้ามข้าม

```powershell
python train\eval_interview.py --adapter models\nong-trongpok-lora
```

ได้ตารางเทียบ 3 แบบ ถ้า fine-tune ไม่ชนะ base+prompt สคริปต์จะบอกให้ใช้ base ไปก่อน

### 4.5 เปิดใช้

แก้ `.env`:

```
LLM_PROVIDER=hf_local
HF_LORA_ADAPTER=./models/nong-trongpok-lora
```

---

## 5. ชั้น A — สกัดทักษะ (ต้อง label เอง)

### 5.1 เขียน label

```powershell
notepad ..\data\labeled\french.md
```

เขียนบรรทัดละประโยค ใส่วงเล็บครอบทักษะ:

```
ผมเขียน [Python|KNOW] ทำ [OCR อ่านใบเสร็จ|SKILL] ให้ร้านพ่อ
เป็นประธานชมรม [จัดค่าย 3 วันให้น้อง 80 คน|SKILL]
มีความตั้งใจสูงและพร้อมเรียนรู้
```

- `KNOW` = ความรู้/เครื่องมือ (คำนาม) — `Python`, `Figma`, `กฎหมายแรงงาน`
- `SKILL` = การกระทำ (มีกริยา) — `ดูแล stock`, `เขียน unit test`
- **บรรทัดที่ไม่ระบายเลย = ประโยคคำโม้ ต้องมี 20-30%**

> **กติกาที่สำคัญที่สุด: ห้าม label คำโม้**
> `[เรียนรู้เร็ว]` ❌ ห้าม — ทั้งโปรเจกต์เราสร้างมาเพื่อแยกคำโม้ออกจากของจริง
> ถ้าสอนโมเดลให้เชื่อคำโม้ = โปรเจกต์ไม่มีความหมาย

ดูตัวอย่างเต็ม: `..\data\labeled\example.md` · กติกาครบ: `train\labeling_guide.md`

### 5.2 แปลงเป็น JSONL

```powershell
python train\markup_to_jsonl.py ..\data\labeled\french.md
```

มันคำนวณ offset ให้เอง + เตือนถ้าวงเล็บไม่ชิดคำ

### 5.3 รวมของทุกคน + ตรวจ

```powershell
python train\prepare_dataset.py
```

บอกจำนวน SKILL/KNOW, % ประโยคเปล่า, ใครระบายคำโม้ไว้, offset เพี้ยนตรงไหน
แล้วแบ่ง train/dev/test ให้อัตโนมัติ

### 5.4 ขยายข้อมูล

```powershell
python train\augment_resumes.py --mode labeled --target 10000 --split
```

### 5.5 เทรน + เทียบ 2 โมเดล

```powershell
python train\train_skill_ner.py
python train\train_skill_ner.py --base clicknext/phayathaibert --out models\skill-ner-phaya
```

ดู F1 ที่ `models\*\metrics.json` ตัวไหนชนะก็ตั้ง `SKILL_MODEL_PATH` เป็นตัวนั้น

---

## 6. เอาข้อมูลขึ้น Supabase

### 6.1 สร้างโปรเจกต์

1. สมัคร https://supabase.com (ฟรี)
2. New project → เลือก region **Southeast Asia (Singapore)** จะเร็วกว่า
3. **จดรหัสผ่านฐานข้อมูลไว้** ตอนสร้าง — หาย้อนหลังไม่ได้

### 6.2 เปิด pgvector

Dashboard → **Database → Extensions** → ค้น `vector` → เปิดสวิตช์

### 6.3 เอา connection string

Dashboard → **Project Settings → Database → Connection string**

> ⚠️ **เลือก "Session pooler" ไม่ใช่ "Direct connection"**
> direct connection ของ Supabase เป็น IPv6 อย่างเดียว
> เน็ตบ้านไทยส่วนใหญ่ต่อไม่ได้ แล้วจะงงว่าทำไม timeout เฉย ๆ

ใส่ลง `.env`:

```
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**ถ้ารหัสผ่านมีอักขระพิเศษ** (`@ # $ % &` ฯลฯ) ต้อง URL-encode ก่อน:

```powershell
[System.Uri]::EscapeDataString('รหัสผ่านของคุณ')
```

เอาผลลัพธ์ไปใส่แทนรหัสผ่านดิบ

### 6.4 ลองก่อนโดยไม่เขียนจริง

```powershell
python db\load_to_supabase.py --what all --dry-run
```

โหมดนี้ไม่ต้องต่อ DB เลย — อ่านไฟล์อย่างเดียว ดูว่าจะใส่อะไรบ้าง

### 6.5 โหลดจริง

```powershell
python db\load_to_supabase.py --what all
```

ทำ 5 ขั้นตามลำดับ: `schema` -> `seed` -> `taxonomy` -> `labeled` -> `security`
แล้วปิดท้ายด้วย verify ว่า offset ใน DB ยังชี้ถูก

> ลำดับสำคัญ — `security` ต้องรัน **ทีหลัง** เพราะ `FORCE ROW LEVEL SECURITY`
> มีผลกับเจ้าของตารางด้วย ถ้าเปิดก่อนแล้วค่อย insert จะโดนบล็อกตัวเอง

### 6.6 🔒 ปิดรูความปลอดภัย — อย่าข้ามขั้นนี้

**Supabase เอาทุกตารางใน `public` ออก REST API ให้อัตโนมัติ**
และ anon key ก็ฝังอยู่ใน JavaScript ของหน้าเว็บ = ใครเปิด DevTools ก็เห็น

ถ้าไม่เปิด Row Level Security ใครก็ยิงคำสั่งนี้ได้:

```
GET https://<project>.supabase.co/rest/v1/candidate_identity?select=*
```

แล้วได้ **GPA ชื่อมหาลัย อายุ ของผู้สมัครทุกคน** กลับไป

ทั้งโปรเจกต์เราขายเรื่อง "ซ่อนตัวตนเพื่อลดอคติ" ถ้ารูนี้เปิดอยู่คำเคลมนั้นเป็นโมฆะ
และกรรมการที่รู้จัก Supabase จะถามแน่นอน

```powershell
python db\load_to_supabase.py --what security
```

หรือวาง `db\002_security.sql` ใน Supabase SQL Editor ตรง ๆ ก็ได้

**ไฟล์นี้ทำ 4 อย่าง:**

| ทำอะไร | ได้อะไร |
|---|---|
| เปิด RLS ทุกตาราง + ถอนสิทธิ์ anon | ปิดหมดก่อน แล้วค่อยเปิดทีละอย่าง |
| เปิดอ่านเฉพาะ 4 ตารางสาธารณะ | `skill_taxonomy` `game_definitions` `companies` `jobs` |
| สร้าง view `hr_candidate_view` | HR เห็นได้เฉพาะที่ไม่ระบุตัวตน — **ไม่ join `candidate_identity` เลยตั้งแต่แรก** |
| ฟังก์ชัน `reveal_candidate_identity()` | ทางเดียวที่เปิดดูตัวตนได้ และมันเขียน log ให้ก่อนคืนข้อมูลเสมอ |

> ที่ต้องทำเป็นฟังก์ชัน ไม่ใช่แค่ "สัญญาว่าจะ log" เพราะสัญญาเลี่ยงได้
> ฟังก์ชันนี้เขียน `reveal_events` **ก่อน** แล้วค่อยคืนข้อมูล ในทรานแซกชันเดียว
> ถ้า log ล้มเหลว = ไม่มีใครได้ข้อมูล และมี trigger กันแก้/ลบ log ย้อนหลังด้วย

**ตรวจว่าปิดครบแล้ว** — วางใน Supabase SQL Editor:

```sql
select tablename, rowsecurity as rls_enabled
from pg_tables where schemaname = 'public'
order by rowsecurity, tablename;
```

ต้องได้ `true` ทุกแถว ถ้ามี `false` แม้แถวเดียว = ยังมีรูอยู่

**ลอง demo ให้กรรมการดูสด:**

```sql
-- HR เปิดดูตัวตน -> ระบบบังคับเขียน log ให้เอง
select * from reveal_candidate_identity(
    '<candidate_uuid>', '<hr_uuid>', 'คัดเลือกเข้ารอบสัมภาษณ์ตำแหน่ง Backend'
);

-- แล้วเปิด log ให้ดูว่ามันขึ้นจริง
select * from reveal_events order by revealed_at desc limit 5;

-- ลองแก้ log ดู -> ระบบไม่ยอม
update reveal_events set reason = 'อย่างอื่น' where id = 1;
```

อันสุดท้ายจะขึ้น error ว่า `reveal_events แก้หรือลบไม่ได้ — เป็นหลักฐานการตรวจสอบ`
นี่คือ demo moment ที่พิสูจน์คำว่า "ลดอคติ" ได้จริง ไม่ใช่แค่พูด

### 6.7 ข้อมูลตั้งต้น

`--what seed` ใส่ให้เอง (อยู่ใน `--what all` แล้ว):

- **นิยามเกม 4 ตัว** พร้อม `axis_weights` ที่ตรงกับ `ai/scoring/radar.py`
- **บริษัทตัวอย่าง 4 แห่ง + ประกาศงาน 4 ตำแหน่ง** พร้อม `trait_profile` ไว้ทดสอบ matching

ชื่อบริษัทเป็นชื่อสมมติทั้งหมด — **อย่าใส่ชื่อบริษัทจริงลงข้อมูล demo**

```powershell
python db\load_to_supabase.py --what seed
```


### 6.8 อะไรควร / ไม่ควรลง

| ชุด | ลงไหม | เพราะ |
|---|---|---|
| label ที่คนระบาย | ✅ | เป็น "หลักฐาน" ที่หน้าเว็บไฮไลต์ได้ทันที ไม่ต้องรอโมเดล |
| skill_taxonomy | ✅ | ระบบ matching query จริง |
| corpus (อังกฤษ) | ⚠️ แค่ `--limit 200` | ใช้ seed demo พอ |
| augmented 10,000 | ❌ | 57 MB ของข้อมูลสังเคราะห์ กิน quota เปล่า |
| บทสัมภาษณ์ 1,200 | ❌ | training data เก็บเป็นไฟล์ดีกว่า |

Supabase free tier ให้ **500 MB** ใช้ให้คุ้ม

### 6.9 ดูข้อมูลใน Supabase

Dashboard → **Table Editor** → เลือกตาราง
หรือ **SQL Editor** แล้วรัน:

```sql
-- ดูทักษะที่ระบายไว้ พร้อมประโยคต้นทาง
select e.span_label, e.surface_text,
       substring(s.raw_text from e.char_start + 1 for e.char_end - e.char_start) as ตัดจากต้นฉบับ,
       s.raw_text as ประโยคเต็ม
from extracted_skills e
join evidence_sources s on s.id = e.source_id
where e.model_version = 'human-label-v1'
limit 20;
```

ถ้าคอลัมน์ `surface_text` กับ `ตัดจากต้นฉบับ` ตรงกันทุกแถว = offset ถูกต้อง

---

## ตารางแปลง bash → PowerShell

| อยากทำ | bash | PowerShell |
|---|---|---|
| ตั้ง env var | `export X=1` / `set X=1` | `$env:X = "1"` |
| ต่อคำสั่ง (ถ้าอันแรกสำเร็จ) | `a && b` | `a; if ($?) { b }` |
| ต่อคำสั่ง (ไม่สนผลลัพธ์) | `a ; b` | `a; b` |
| ลบโฟลเดอร์ | `rm -rf dir` | `Remove-Item dir -Recurse -Force` |
| ก๊อปไฟล์ | `cp a b` | `Copy-Item a b` |
| ดูไฟล์ (ไทย) | `cat f` | `Get-Content f -Encoding UTF8` |
| 10 บรรทัดแรก | `head -10 f` | `Get-Content f -TotalCount 10 -Encoding UTF8` |
| 10 บรรทัดท้าย | `tail -10 f` | `Get-Content f -Tail 10 -Encoding UTF8` |
| นับบรรทัด | `wc -l f` | `(Get-Content f \| Measure-Object -Line).Lines` |
| เขียนไฟล์ (ไทย) | `echo x > f` | `"x" \| Out-File f -Encoding utf8` |
| หาไฟล์ | `find . -name "*.py"` | `Get-ChildItem -Recurse -Filter *.py` |
| ค้นในไฟล์ | `grep x f` | `Select-String x f` |
| ยิง API | `curl -X POST ...` | `Invoke-RestMethod -Method Post ...` |
| ตัวแปร | `$X` | `$X` (เหมือนกัน) |

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `UnicodeEncodeError` | Python เขียนไทยไม่ได้ | `$env:PYTHONIOENCODING = "utf-8"` |
| เห็น `à¸„à¸¸à¸“` แทน `คุณ` ตอน print | console ไม่ได้เป็น UTF-8 | `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` |
| เห็น `à¸„à¸¸à¸“` ตอน `Get-Content` | PS 5.1 อ่านเป็น ANSI | ใส่ `-Encoding UTF8` |
| ไฟล์ที่เขียนออกมาไทยเพี้ยน | `Set-Content` เขียนเป็น ANSI | ใส่ `-Encoding utf8` |
| `Activate.ps1 cannot be loaded` | execution policy | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `&&` ขึ้น parser error | PS 5.1 ไม่มี `&&` | ใช้ `;` แทน |
| `Invoke-WebRequest: ...` ตอนใช้ curl | `curl` เป็น alias | ใช้ `Invoke-RestMethod` หรือ `curl.exe` |
| `not enough space on the disk` | ดิสก์เต็ม | ดูขั้นที่ 2 |
| `CUDA out of memory` | VRAM 6.4 GB ไม่พอ | `--seq 768 --rank 8` + ปิด Chrome |
| `ModuleNotFoundError: train` | รันผิดโฟลเดอร์ | `cd C:\Users\User\generation_hack\ai-service` |
| `ไม่พบไฟล์ .jsonl ใน data\labeled` | ยังไม่มีใคร label | ดูขั้นที่ 5.1 |
| ต่อ Supabase timeout | ใช้ direct connection (IPv6) | เปลี่ยนเป็น Session pooler |
| Supabase ต่อไม่ได้เฉย ๆ | free tier pause หลังไม่ใช้ 7 วัน | เข้า dashboard กด resume |
| `password authentication failed` | รหัสผ่านมีอักขระพิเศษ | URL-encode ด้วย `[System.Uri]::EscapeDataString()` |

---

## ลำดับที่แนะนำสัปดาห์นี้

| # | ทำอะไร | ใช้เวลา | ติดอะไรอยู่ |
|---|---|---|---|
| 1 | เคลียร์ดิสก์ให้ว่าง 12 GB | 30 นาที | ← ติดตรงนี้ |
| 2 | ขอ Typhoon API key + ทดสอบแชท | 10 นาที | — |
| 3 | บอกพี่ฟรองแก้ `telemetry.ts` | 1 นาที | — |
| 4 | สร้าง Supabase + `--what schema` | 20 นาที | — |
| 5 | **เริ่ม label ประโยคแรก** | เรื่อย ๆ | ← คอขวดตัวจริง |
| 6 | เทรนตัวคุย + วัดผล | 1 ชม. | รอข้อ 1 |

ข้อ 2 กับ 5 ทำขนานกันได้ และสำคัญที่สุดสองอันครับ
