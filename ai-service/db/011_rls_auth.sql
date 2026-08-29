-- =====================================================================
-- RLS ที่ผูกกับ Supabase Auth จริง
--
--   Supabase Dashboard -> SQL Editor -> วางทั้งไฟล์ -> Run
--   ต้องรัน db/010_team_security.sql ก่อน และต้อง migrate ฝั่ง Prisma แล้ว
--   (frontend/prisma/migrations/20260828120000_supabase_auth)
--
-- 010 = ปิดประตูทั้งหมด (ไม่มี policy = ไม่มีใครเข้าได้ทาง REST API)
-- 011 = เปิดเฉพาะช่องที่ควรเปิด โดยให้ Postgres เป็นคนตัดสินว่าใครเห็นแถวไหน
--
-- ---------------------------------------------------------------------
-- ทำไมเพิ่งทำได้ตอนนี้
--
-- ก่อนหน้านี้เขียน policy ไม่ได้เลย เพราะฐานข้อมูลไม่รู้จัก "ผู้ใช้ที่ล็อกอินอยู่"
-- session เก็บ id ไว้ใน localStorage ของเบราว์เซอร์ ซึ่ง Postgres มองไม่เห็น
-- พอมี Google sign-in ผ่าน Supabase Auth แล้ว ทุก request ที่มาทาง REST API
-- จะพก JWT ที่ auth.uid() อ่านได้ -> เทียบกับ "JobSeeker".supabaseUserId ได้ตรง ๆ
--
-- ---------------------------------------------------------------------
-- แอปหลักยังไม่พึ่งไฟล์นี้
--
-- Next.js คุยกับ DB ผ่าน Prisma ด้วย postgres user ซึ่ง bypass RLS
-- ไฟล์นี้จึงเป็นด่านสำหรับ "ใครก็ตามที่หยิบ anon key จาก JavaScript ไปยิง REST API"
-- ซึ่งเป็นสิ่งที่เกิดขึ้นได้จริงเพราะ anon key เป็นของสาธารณะโดยการออกแบบ
--
-- ผลพลอยได้ที่เอาขึ้นเวทีได้: เปิด DevTools แล้วยิง
--     GET /rest/v1/RevealEvent?select=*
-- ด้วย token ของผู้สมัครคนหนึ่ง จะได้เฉพาะแถวของตัวเอง ไม่ใช่ของทุกคน
-- **Postgres เป็นคนบังคับ ไม่ใช่โค้ดที่เราเขียน** — พิสูจน์ได้สดหน้างาน
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ตัวช่วย: แปลง auth.uid() เป็น id ในตารางของเรา
--
-- SECURITY DEFINER เพราะฟังก์ชันต้องอ่าน "JobSeeker" เพื่อหา id
-- แต่ผู้เรียกยังไม่มีสิทธิ์อ่านตารางนั้น (นั่นคือสิ่งที่เรากำลังจะกำหนด)
-- ตั้ง search_path ตายตัวไว้ กัน schema ปลอมมาแทรกกลาง
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_job_seeker_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT id FROM public."JobSeeker" WHERE "supabaseUserId" = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION public.current_hr_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT id FROM public."HRUser" WHERE "supabaseUserId" = auth.uid()::text
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT "companyId" FROM public."HRUser" WHERE "supabaseUserId" = auth.uid()::text
$$;

REVOKE EXECUTE ON FUNCTION public.current_job_seeker_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.current_hr_user_id()   FROM public;
REVOKE EXECUTE ON FUNCTION public.current_company_id()   FROM public;
GRANT  EXECUTE ON FUNCTION public.current_job_seeker_id() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_hr_user_id()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_company_id()    TO authenticated;


-- ---------------------------------------------------------------------
-- 2. ผู้สมัครเห็นแถวของตัวเอง
--
-- GRANT ระบุคอลัมน์ ไม่ใช่ทั้งตาราง — password ยังเป็น plaintext อยู่
-- ต่อให้เป็นรหัสของตัวเอง ก็ไม่มีเหตุผลที่ REST API ต้องส่งมันออกไป
-- (เรื่อง hash รหัสผ่านยังค้างอยู่ ดูหมายเหตุท้ายไฟล์)
-- ---------------------------------------------------------------------
GRANT SELECT (id, name, email, "avatarUrl", "createdAt")
    ON public."JobSeeker" TO authenticated;

DROP POLICY IF EXISTS jobseeker_select_own ON public."JobSeeker";
CREATE POLICY jobseeker_select_own ON public."JobSeeker"
    FOR SELECT TO authenticated
    USING ("supabaseUserId" = auth.uid()::text);


-- ---------------------------------------------------------------------
-- 3. โปรไฟล์ / ผลเกม / สรุป AI — ของใครของมัน
--
-- จงใจ **ไม่** เปิด EducationEntry กับ WorkExperienceEntry
-- สองตารางนั้นมี institution กับ gpa ซึ่งเป็นข้อมูลที่ทีมตกลงกันว่าต้องซ่อน
-- ถ้าเปิดให้ authenticated อ่านได้ ก็เท่ากับเปิดช่องให้ดึงออกไปทาง REST
-- ---------------------------------------------------------------------
GRANT SELECT ON public."JobSeekerProfile" TO authenticated;
DROP POLICY IF EXISTS profile_select_own ON public."JobSeekerProfile";
CREATE POLICY profile_select_own ON public."JobSeekerProfile"
    FOR SELECT TO authenticated
    USING ("jobSeekerId" = public.current_job_seeker_id());

GRANT SELECT ON public."GameResult" TO authenticated;
DROP POLICY IF EXISTS gameresult_select_own ON public."GameResult";
CREATE POLICY gameresult_select_own ON public."GameResult"
    FOR SELECT TO authenticated
    USING ("jobSeekerId" = public.current_job_seeker_id());

GRANT SELECT ON public."AISummary" TO authenticated;
DROP POLICY IF EXISTS aisummary_select_own ON public."AISummary";
CREATE POLICY aisummary_select_own ON public."AISummary"
    FOR SELECT TO authenticated
    USING ("jobSeekerId" = public.current_job_seeker_id());


-- ---------------------------------------------------------------------
-- 4. RevealEvent — ผู้สมัครตรวจสอบได้ว่าใครเปิดดูตัวตนตัวเองบ้าง
--
-- อันนี้คือหัวใจของคำเคลม "ลดอคติแบบตรวจสอบได้"
-- คำสัญญาว่า "เราซ่อนตัวตนให้" ที่ผู้สมัครตรวจเองไม่ได้ ก็เป็นแค่คำพูด
-- policy นี้ทำให้เขาดึง log ของตัวเองได้โดยตรง และ **ดึงของคนอื่นไม่ได้**
-- โดยไม่ต้องเชื่อโค้ดฝั่งเราเลยสักบรรทัด
--
-- ไม่มี policy สำหรับ INSERT/UPDATE/DELETE โดยตั้งใจ
-- การเขียน log ต้องเกิดจาก Prisma ในทรานแซกชันเดียวกับการอ่านข้อมูลตัวตน
-- เท่านั้น ไม่ใช่สิ่งที่ client ยิงเข้ามาเองได้ (และลบทิ้งเองไม่ได้ด้วย)
-- ---------------------------------------------------------------------
GRANT SELECT ON public."RevealEvent" TO authenticated;

DROP POLICY IF EXISTS revealevent_select_own ON public."RevealEvent";
CREATE POLICY revealevent_select_own ON public."RevealEvent"
    FOR SELECT TO authenticated
    USING ("jobSeekerId" = public.current_job_seeker_id());

-- HR เห็นเฉพาะรายการที่ตัวเองเป็นคนกดเปิด — ไว้ตรวจย้อนหลังในทีมตัวเอง
DROP POLICY IF EXISTS revealevent_select_by_hr ON public."RevealEvent";
CREATE POLICY revealevent_select_by_hr ON public."RevealEvent"
    FOR SELECT TO authenticated
    USING ("hrUserId" = public.current_hr_user_id());


-- ---------------------------------------------------------------------
-- 5. การแจ้งเตือน — ของผู้รับเท่านั้น
-- ---------------------------------------------------------------------
GRANT SELECT ON public."Notification" TO authenticated;
DROP POLICY IF EXISTS notification_select_own ON public."Notification";
CREATE POLICY notification_select_own ON public."Notification"
    FOR SELECT TO authenticated
    USING (
        "jobSeekerId" = public.current_job_seeker_id()
        OR "hrUserId" = public.current_hr_user_id()
    );


-- ---------------------------------------------------------------------
-- 6. ประกาศงาน — เปิดอ่านได้ แต่เฉพาะที่ยังเปิดรับ
--
-- หน้า /job เป็นหน้าสาธารณะอยู่แล้ว ตรงนี้จึงไม่ได้เปิดอะไรใหม่
-- แต่ที่ต้องเขียนเป็น policy เพราะ "เปิดรับอยู่" ควรถูกบังคับที่ฐานข้อมูล
-- ไม่ใช่หวังว่าทุก query ในอนาคตจะจำใส่ WHERE status = 'open' เอง
-- ---------------------------------------------------------------------
GRANT SELECT ON public."Position" TO anon, authenticated;
DROP POLICY IF EXISTS position_select_open ON public."Position";
CREATE POLICY position_select_open ON public."Position"
    FOR SELECT TO anon, authenticated
    USING (status = 'open');

-- HR เห็นทุกตำแหน่งของบริษัทตัวเอง รวมที่ปิดไปแล้ว
DROP POLICY IF EXISTS position_select_own_company ON public."Position";
CREATE POLICY position_select_own_company ON public."Position"
    FOR SELECT TO authenticated
    USING ("companyId" = public.current_company_id());


-- ---------------------------------------------------------------------
-- 7. Match — ผู้สมัครเห็นของตัวเอง / HR เห็นเฉพาะของบริษัทตัวเอง
-- ---------------------------------------------------------------------
GRANT SELECT ON public."Match" TO authenticated;

DROP POLICY IF EXISTS match_select_own ON public."Match";
CREATE POLICY match_select_own ON public."Match"
    FOR SELECT TO authenticated
    USING ("jobSeekerId" = public.current_job_seeker_id());

DROP POLICY IF EXISTS match_select_own_company ON public."Match";
CREATE POLICY match_select_own_company ON public."Match"
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."Position" p
            WHERE p.id = "Match"."positionId"
              AND p."companyId" = public.current_company_id()
        )
    );


-- ---------------------------------------------------------------------
-- 8. ตรวจผลลัพธ์
--
-- ตารางที่ควรมี policy แล้ว vs ตารางที่ยังปิดสนิท (ซึ่งถูกต้อง)
-- ---------------------------------------------------------------------
SELECT
    t.tablename,
    count(p.policyname) AS policies,
    CASE WHEN count(p.policyname) = 0
         THEN 'ปิดสนิท (ไม่มีใครเข้าทาง REST ได้)'
         ELSE 'เปิดแบบมีเงื่อนไข'
    END AS status
FROM pg_tables t
LEFT JOIN pg_policies p
       ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public' AND t.tablename <> '_prisma_migrations'
GROUP BY t.tablename
ORDER BY count(p.policyname) DESC, t.tablename;


-- =====================================================================
-- ยังค้างอยู่ ไม่ได้แก้ในไฟล์นี้
--
-- 1. "JobSeeker".password กับ "HRUser".password ยังเป็น plaintext
--    RLS ไม่ได้ช่วยเรื่องนี้เลย ใครที่เข้าถึง DB ได้ (เช่นทีมเราเอง หรือ
--    คนที่ได้ service-role key ไป) ก็อ่านรหัสผ่านของผู้ใช้ 43 คนได้ตรง ๆ
--    ทางแก้จริงคือ hash ด้วย bcrypt/argon2 หรือย้ายทุกคนไป Google sign-in
--
-- 2. บัญชีที่ยังไม่ได้ผูก Google (supabaseUserId เป็น NULL) จะไม่เข้าเงื่อนไข
--    policy ข้อไหนเลย ซึ่งถูกต้อง — คนเหล่านั้นเข้าผ่านเว็บ (Prisma) เท่านั้น
--    ไม่ได้เข้าทาง REST API
-- =====================================================================
