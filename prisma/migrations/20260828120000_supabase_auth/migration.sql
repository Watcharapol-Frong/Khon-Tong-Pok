-- เชื่อมบัญชีในระบบเข้ากับ Supabase Auth (เข้าสู่ระบบด้วย Google)
--
-- ปลอดภัยกับข้อมูลเดิม: เพิ่มคอลัมน์ที่เป็น NULL ได้ และ "ผ่อน" NOT NULL ของ
-- password เท่านั้น ไม่มีการลบหรือแก้ค่าของแถวที่มีอยู่แล้ว 43 บัญชีเดิม
-- ยังเข้าสู่ระบบด้วยรหัสผ่านได้เหมือนเดิมทุกประการ
--
-- ทำไม password ต้องยอมให้เป็น NULL: บัญชีที่สมัครผ่าน Google ไม่มีรหัสผ่าน
-- ถ้าคอลัมน์ยังบังคับ NOT NULL อยู่ โค้ดจะต้องกรอกอะไรสักอย่างลงไปแทน
-- ซึ่งแปลว่ามี "รหัสผ่านปลอม" ที่เดาได้อยู่ในฐานข้อมูลของทุกบัญชี Google

ALTER TABLE "JobSeeker" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;
ALTER TABLE "JobSeeker" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "JobSeeker" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "HRUser" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;
ALTER TABLE "HRUser" ALTER COLUMN "password" DROP NOT NULL;

-- UNIQUE สำคัญมาก ไม่ใช่แค่ index ไว้ค้นเร็ว
-- ถ้าบัญชี Google หนึ่งอันผูกกับผู้สมัครได้สองแถว การเข้าสู่ระบบครั้งเดียว
-- จะได้ตัวตนไม่แน่นอน แล้วแต่ว่า query คืนแถวไหนมาก่อน
CREATE UNIQUE INDEX IF NOT EXISTS "JobSeeker_supabaseUserId_key"
    ON "JobSeeker"("supabaseUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "HRUser_supabaseUserId_key"
    ON "HRUser"("supabaseUserId");
