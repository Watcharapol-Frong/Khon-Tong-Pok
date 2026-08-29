# เข้าสู่ระบบด้วย Google + เชื่อม Supabase

ทำตามลำดับนี้ ประมาณ 25 นาที รวมรอ Google

---

## 0. ทำไมต้องเปลี่ยน ไม่ใช่แค่ "เพิ่มฟีเจอร์"

ระบบเดิมเก็บ `{ jobSeekerId }` ไว้ใน localStorage แล้วส่ง id นั้นไปให้เซิร์ฟเวอร์
ทุกครั้ง เซิร์ฟเวอร์ก็ `findUnique({ where: { id } })` ตามที่ได้รับมา

แปลว่า **id คือรหัสผ่าน** และ id ไม่ใช่ความลับ

เปิด DevTools แล้วเปลี่ยนค่าใน localStorage เป็น id ของผู้สมัครคนอื่น
ก็กลายเป็นคนนั้นทันที เห็นโปรไฟล์ ผลเกม สรุป AI และการแจ้งเตือนของเขาทั้งหมด
ฝั่ง HR เป็นแบบเดียวกันแต่หนักกว่า เพราะ `companyId` ก็มาจาก localStorage
เปลี่ยนค่าเดียวก็เห็นผู้สมัครของบริษัทอื่น

ตอนนี้ตัวตนมาจาก 2 ทางที่เซิร์ฟเวอร์ตรวจเองเท่านั้น:

| ทาง | ใช้กับ | ตรวจยังไง |
|---|---|---|
| Supabase Auth | บัญชีที่เข้าด้วย Google | `getUser()` ตรวจ JWT กับ auth server |
| คุกกี้ที่เราเซ็น | 43 บัญชีเดิมที่มีรหัสผ่าน | HMAC-SHA256 + httpOnly |

localStorage เหลือไว้แค่ธงว่า "ล็อกอินอยู่" ให้ navbar ไม่กระพริบ ไม่มีผลต่อสิทธิ์อะไรเลย

---

## 1. สร้าง OAuth client ที่ Google

1. เปิด https://console.cloud.google.com/apis/credentials
2. **Create Credentials → OAuth client ID → Web application**
3. **Authorized redirect URIs** ใส่บรรทัดนี้ (เอา URL โปรเจกต์ Supabase ของทีมมาใส่):

```
https://cpbmyfttdegmtxcrafpk.supabase.co/auth/v1/callback
```

> ใส่ของ **Supabase** ไม่ใช่ของเว็บเราเอง — Google คุยกับ Supabase ก่อน
> แล้ว Supabase ค่อยส่งกลับมาที่ `/auth/callback` ของเรา
> ใส่ผิดจุดนี้คือสาเหตุอันดับหนึ่งของ `redirect_uri_mismatch`

4. เก็บ **Client ID** กับ **Client Secret** ไว้

---

## 2. เปิด Google provider ใน Supabase

1. Supabase Dashboard → **Authentication → Sign In / Providers → Google**
2. เปิดสวิตช์ แล้ววาง Client ID / Client Secret จากข้อ 1
3. ไป **Authentication → URL Configuration → Redirect URLs** เพิ่มทั้งสองอัน:

```
http://localhost:3000/auth/callback
https://khontongpok.vercel.app/auth/callback
```

ตอน deploy จริงต้องมีของ production ด้วย ไม่งั้นเข้าได้เฉพาะบนเครื่องตัวเอง

---

## 3. ตั้งค่า `frontend/.env.local`

สร้างไฟล์ใหม่ชื่อ `.env.local` ในโฟลเดอร์ `frontend`

> **ระวัง Notepad** มันชอบต่อ `.txt` ท้ายไฟล์ให้เอง
> เคยเสียเวลากับเรื่องนี้มาแล้วรอบหนึ่งตอนตั้ง `.env` ของ ai-service
> เช็คด้วย `dir /a` ว่าชื่อไฟล์เป็น `.env.local` เฉย ๆ จริง

```
NEXT_PUBLIC_SUPABASE_URL=https://cpbmyfttdegmtxcrafpk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
AUTH_SECRET=<ใส่ค่าที่สุ่มได้จากคำสั่งข้างล่าง>
DATABASE_URL=<เหมือนที่ใช้อยู่ตอนนี้>
DIRECT_URL=<เหมือนที่ใช้อยู่ตอนนี้>
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

สุ่ม `AUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

anon key อยู่ที่ Supabase Dashboard → **Project Settings → API Keys**
เอา **anon / publishable** เท่านั้น **ห้ามเอา service_role มาใส่** — ตัวนั้น bypass RLS ทั้งหมด
และไฟล์นี้มีตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` ซึ่งถูกฝังลงใน JavaScript ที่ส่งให้เบราว์เซอร์

ถ้าไม่ตั้ง `AUTH_SECRET` ระบบจะ **ปฏิเสธ** การล็อกอินด้วยรหัสผ่านไปเลย
ไม่ใช่ปล่อยผ่านแบบไม่มีลายเซ็น — ตั้งใจให้พังดังกว่าเงียบแล้วไม่ปลอดภัย

---

## 4. อัปเดตฐานข้อมูล

```powershell
npx prisma migrate deploy
```

migration นี้เพิ่มคอลัมน์ที่เป็น NULL ได้ และผ่อน `NOT NULL` ของ `password`
**ไม่แตะข้อมูลเดิม** 43 บัญชีเดิมยังเข้าด้วยรหัสผ่านได้ตามปกติ

จากนั้นเปิด Supabase → SQL Editor แล้วรันตามลำดับ:

```
ai-service/db/010_team_security.sql   (ถ้ายังไม่ได้รัน — เปิด RLS ทุกตาราง)
ai-service/db/011_rls_auth.sql        (policy ที่ผูกกับ auth.uid())
```

### แปลงรหัสผ่านเป็น hash

ดูก่อนว่าจะแตะกี่แถว:

```powershell
npm run db:hash-passwords -- --dry-run
```

แล้วทำจริง:

```powershell
npm run db:hash-passwords
```

**ทุกคนยังล็อกอินด้วยรหัสผ่านเดิมได้ ไม่ต้องตั้งใหม่** เพราะเรารู้ค่าเดิม
(มันถูกเก็บเป็น plaintext อยู่) เลยแฮชให้ได้เลย

นี่คือ**โอกาสสุดท้าย**ที่ทำได้ง่ายขนาดนี้ครับ พอแฮชแล้วจะย้อนกลับไปอ่านค่าเดิมไม่ได้อีก
ซึ่งเป็นสิ่งที่ถูกต้อง แต่แปลว่าถ้าไม่รันตอนนี้ รหัสผ่านของคนที่ไม่ได้กลับมาล็อกอินอีก
จะเป็น plaintext ค้างอยู่ตลอดไป

---

## 5. ลองใช้

```powershell
npm run dev
```

เช็ค 5 อย่างนี้:

1. `/login` → กด **เข้าสู่ระบบด้วย Google** → เลือกบัญชี → เด้งกลับมาที่ `/decoder`
2. เข้าด้วย **อีเมลเดิมที่เคยสมัครไว้** → ต้องเข้าบัญชีเดิม ไม่ใช่สร้างใหม่
   (ผูกด้วยอีเมล เฉพาะอีเมลที่ Google ยืนยันแล้วเท่านั้น)
3. ล็อกอินด้วยรหัสผ่านของบัญชีเดิม → ต้องยังเข้าได้
4. **ทดสอบช่องโหว่เก่า**: เปิด DevTools → Application → Local Storage
   ลบทุกอย่างแล้วใส่ `ktp_jobseeker_session` เป็น id ของคนอื่น → รีเฟรช
   ต้องเด้งไป `/login` ไม่ใช่เข้าเป็นคนนั้น
5. กด **ออกจากระบบ** → ต้องกลับมาที่ `/login` และกด Back แล้วเข้าไม่ได้

---

## 6. ฝั่ง HR ต่างจากฝั่งผู้สมัครโดยตั้งใจ

Google sign-in ฝั่ง HR **ผูกกับบัญชีที่มีอยู่แล้วเท่านั้น สร้างใหม่ไม่ได้**

เพราะ `HRUser` ต้องสังกัด `Company` ซึ่งเราเดาจากโปรไฟล์ Google ไม่ได้
ถ้าปล่อยให้สร้างเองได้ ใครก็ตามที่มีอีเมลโดเมนเดียวกับบริษัทหนึ่ง
จะกลายเป็น HR ของบริษัทนั้นได้ทันที

ลำดับที่ถูกคือ: ลงทะเบียนบริษัทด้วยอีเมล/รหัสผ่านก่อน → แล้วค่อยเข้าด้วย Google ครั้งถัดไป

---

## 7. ชั้นความปลอดภัยที่มีตอนนี้

| ชั้น | กันอะไร |
|---|---|
| session ฝั่งเซิร์ฟเวอร์ | ยึดบัญชีด้วยการแก้ localStorage |
| server action หา id เอง | อ่านข้อมูลคนอื่น · ข้ามไปดูของบริษัทอื่น |
| scrypt (~115 ms/ครั้ง) | เดารหัสผ่านแบบ offline ถ้าฐานข้อมูลหลุด |
| จำกัด 8 ครั้ง / 15 นาที | เดารหัสผ่านแบบ online |
| หน่วงเวลาเท่ากันตอนไม่เจออีเมล | ไล่เดาว่าอีเมลไหนมีบัญชีอยู่ |
| RLS + `auth.uid()` | คนที่เอา anon key จาก JavaScript ไปยิง REST API |
| security headers | clickjacking · MIME sniffing · referer รั่ว |

**หมายเหตุเรื่อง rate limit** ที่ต้องรู้ก่อนเอาไปพูดบนเวที: มันนับอยู่ในหน่วยความจำ
ของ process บนเครื่องเดียวใช้ได้จริง แต่บน Vercel แต่ละ instance นับแยกกัน
เพดานจริงเลยเป็น 8 × จำนวน instance ที่อุ่นอยู่ และรีเซ็ตทุกครั้งที่ cold start
ของจริงต้องเก็บตัวนับใน Postgres หรือ Redis — อันนี้กันสคริปต์จากโน้ตบุ๊กเครื่องเดียว
ซึ่งเป็นภัยที่มีจริงในช่วงนี้ ไม่ได้กันการโจมตีแบบกระจาย

---

## 8. ยังค้างอยู่ พูดตรง ๆ

- **ยังไม่มี OTP จริง** หน้า `/register` ยังรับรหัสอะไรก็ได้ 6 หลัก
  ทางที่เร็วที่สุดคือดัน Google เป็นทางหลักแล้วเลิกใช้ฟอร์มสมัครด้วยรหัสผ่าน
- **guard ยังเป็นฝั่ง client** หน้าเว็บยังเข้า URL ได้ แล้วค่อยเด้งออก
  แต่ **ข้อมูลปลอดภัย** เพราะทุก server action หาตัวตนเองใหม่ทุกครั้ง
  เข้าไปได้ก็ไม่ได้อะไรกลับไป
