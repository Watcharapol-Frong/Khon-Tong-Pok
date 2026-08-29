-- =====================================================================
-- ปิดรูความปลอดภัยของฐานข้อมูลทีม (kon-trong-pok-db)
--
-- วางทั้งไฟล์ใน Supabase Dashboard -> SQL Editor -> Run
-- รันซ้ำได้ ไม่พัง
--
-- เขียนให้ตรงกับตารางจริงของทีม (Prisma ตั้งชื่อแบบ PascalCase ต้องใส่ "..." ครอบ)
-- =====================================================================
--
-- ทำไมต้องรีบ
--
-- ตอนนี้ RLS ปิดอยู่ทุกตาราง และ Supabase เปิดทุกตารางใน public
-- ออก REST API ให้อัตโนมัติ ส่วน anon key ก็ฝังอยู่ใน JavaScript ของหน้าเว็บ
-- = ใครเปิด DevTools ก็เห็น
--
-- แปลว่าตอนนี้ใครก็ยิงคำสั่งนี้ได้:
--     GET /rest/v1/JobSeeker?select=email,password
-- แล้วได้อีเมลกับรหัสผ่านของผู้ใช้ 43 คน (ซึ่งเก็บเป็น plaintext)
--
--     GET /rest/v1/EducationEntry?select=institution,gpa
-- ได้ชื่อมหาวิทยาลัยกับเกรดทุกคน = คำเคลมเรื่องลดอคติเป็นโมฆะ
--
-- ---------------------------------------------------------------------
-- แล้วแอปจะพังไหม -> ไม่พัง
--
-- Next.js ต่อผ่าน Prisma ด้วย connection string ของ postgres user
-- ซึ่ง bypass RLS อยู่แล้ว การเปิด RLS ปิดทางเฉพาะ anon/authenticated
-- ที่เข้ามาทาง REST API เท่านั้น
--
-- **จงใจไม่ใช้ FORCE ROW LEVEL SECURITY** เพราะ FORCE จะบังคับใช้กับ
-- เจ้าของตารางด้วย ซึ่งจะไปบล็อก Prisma เอง
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. เปิด RLS ทุกตาราง
--    ไม่มี policy = anon เข้าไม่ได้เลย (Prisma ยังทำงานปกติ)
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        RAISE NOTICE 'เปิด RLS: %', t;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 2. ถอนสิทธิ์ตรงจาก anon
--    RLS อย่างเดียวไม่พอถ้า GRANT ยังเปิดค้างอยู่
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- ตารางที่อ่อนไหวที่สุด — ห้ามแตะเด็ดขาด แม้แต่ผู้ใช้ที่ login แล้ว
REVOKE ALL ON public."JobSeeker"        FROM anon, authenticated;  -- มี password plaintext
REVOKE ALL ON public."HRUser"           FROM anon, authenticated;  -- มี password plaintext
REVOKE ALL ON public."EducationEntry"   FROM anon, authenticated;  -- เกรด + มหาวิทยาลัย
REVOKE ALL ON public."JobSeekerProfile" FROM anon, authenticated;  -- วันเกิด เพศ ที่อยู่ เบอร์


-- ---------------------------------------------------------------------
-- 3. เปิดอ่านเฉพาะข้อมูลสาธารณะจริง ๆ
--    (ประกาศงานกับบริษัท — ไม่มีอะไรระบุตัวผู้สมัคร)
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public."Position", public."Company" TO anon;

DO $$ BEGIN
    CREATE POLICY public_read_positions ON public."Position"
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY public_read_companies ON public."Company"
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------
-- 4. ตรวจว่าปิดครบแล้ว — ควรได้ true ทุกแถว
-- ---------------------------------------------------------------------
SELECT tablename,
       rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;


-- ---------------------------------------------------------------------
-- 5. ตารางไหนที่ anon ยังอ่านได้บ้าง — ควรเหลือแค่ Position กับ Company
-- ---------------------------------------------------------------------
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
ORDER BY table_name;
