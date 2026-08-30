-- =====================================================================
-- คนตรงปก — ความปลอดภัยระดับฐานข้อมูล (Supabase)
--
--   psql "$DATABASE_URL" -f db/002_security.sql
--   หรือวางใน Supabase Dashboard -> SQL Editor
--
-- รันซ้ำได้ ไม่พัง
-- =====================================================================
--
-- ทำไมต้องมีไฟล์นี้
--
-- Supabase เอาทุกตารางใน schema `public` ออก REST API ให้อัตโนมัติ
-- และ anon key ก็ฝังอยู่ใน JavaScript ของหน้าเว็บ = ใครเปิด DevTools ก็เห็น
--
-- แปลว่าถ้าไม่เปิด Row Level Security ใครก็ยิง
--     GET /rest/v1/candidate_identity?select=*
-- แล้วได้ GPA ชื่อมหาลัย อายุ ของผู้สมัครทุกคนกลับไป
--
-- ทั้งโปรเจกต์เราขายเรื่อง "ซ่อนตัวตนเพื่อลดอคติ" ถ้ารูนี้เปิดอยู่
-- คำเคลมนั้นเป็นโมฆะทันที และกรรมการที่รู้เรื่อง Supabase จะถามแน่
--
-- แนวทางที่ใช้: **ปิดหมดก่อน แล้วค่อยเปิดทีละอย่าง**
--   - เปิด RLS ทุกตาราง แต่ไม่ให้ policy กับ anon = อ่านไม่ได้เลย
--   - backend (FastAPI) ต่อด้วย service_role ซึ่ง bypass RLS อยู่แล้ว ทำงานได้ปกติ
--   - เปิด SELECT ให้เฉพาะข้อมูลที่เป็นสาธารณะจริง ๆ (ประกาศงาน คลังทักษะ)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. เปิด RLS ทุกตาราง
--    ไม่มี policy = ไม่มีใครเข้าถึงได้ ยกเว้น service_role
-- ---------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        -- FORCE ทำให้เจ้าของตารางก็โดน RLS ด้วย กัน service ที่ต่อผิด role
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 2. เพิกถอนสิทธิ์ตรงจาก anon ทุกตาราง
--    RLS อย่างเดียวไม่พอถ้า GRANT ยังเปิดค้างอยู่
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- ตารางที่มีข้อมูลอ่อนไหวที่สุด — ห้ามแตะเด็ดขาด แม้แต่ authenticated
REVOKE ALL ON public.candidate_identity FROM anon, authenticated;
REVOKE ALL ON public.reveal_events      FROM anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. เปิดอ่านเฉพาะข้อมูลสาธารณะจริง ๆ
--    (ประกาศงาน บริษัท คลังทักษะ นิยามเกม — ไม่มีอะไรระบุตัวบุคคล)
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.skill_taxonomy, public.game_definitions,
                public.companies, public.jobs TO anon;

DO $$ BEGIN
    CREATE POLICY public_read_skills ON public.skill_taxonomy
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY public_read_games ON public.game_definitions
        FOR SELECT TO anon USING (is_active);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY public_read_companies ON public.companies
        FOR SELECT TO anon USING (verified);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY public_read_open_jobs ON public.jobs
        FOR SELECT TO anon USING (is_open);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------
-- 4. มุมมองสำหรับ HR — เห็นได้เฉพาะสิ่งที่ไม่ระบุตัวตน
--
-- นี่คือสิ่งที่ HR query ในด่านแรก ไม่มีทางหลุดชื่อ/เกรด/มหาลัย
-- เพราะ view นี้ไม่ได้ join ตาราง candidate_identity เลยตั้งแต่แรก
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.hr_candidate_view AS
SELECT
    p.user_id,
    p.display_alias,
    p.headline,
    p.about,
    p.year_of_study,
    p.open_to_work,
    r.axes           AS trait_axes,
    r.overall_index,
    (SELECT count(*) FROM extracted_skills e
      WHERE e.user_id = p.user_id AND e.status = 'confirmed') AS n_confirmed_skills
FROM candidate_profile p
LEFT JOIN LATERAL (
    SELECT axes, overall_index
    FROM radar_profiles rp
    WHERE rp.user_id = p.user_id
    ORDER BY computed_at DESC
    LIMIT 1
) r ON true
WHERE p.open_to_work;

COMMENT ON VIEW public.hr_candidate_view IS
    'สิ่งที่ HR เห็นในด่านแรก — ไม่ join candidate_identity โดยเจตนา';


-- ---------------------------------------------------------------------
-- 5. เปิดดูตัวตนได้ทางเดียวเท่านั้น: ผ่านฟังก์ชันที่บังคับเขียน log
--
-- ออกแบบแบบนี้เพราะ "สัญญาว่าจะ log" ไม่พอ ต้องทำให้ **เลี่ยงไม่ได้**
-- ฟังก์ชันนี้เขียน reveal_events ก่อน แล้วค่อยคืนข้อมูล ในทรานแซกชันเดียว
-- ถ้า log ล้มเหลว = ไม่มีใครได้ข้อมูล
--
-- ตอน demo เปิด reveal_events ให้กรรมการดูสดได้เลยว่ามันขึ้นจริงทุกครั้ง
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_candidate_identity(
    p_candidate_id uuid,
    p_hr_id        uuid,
    p_reason       text,
    p_job_id       uuid DEFAULT NULL
)
RETURNS TABLE (
    full_name  text,
    university text,
    faculty    text,
    gpa        numeric,
    revealed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_at timestamptz;
BEGIN
    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'ต้องระบุเหตุผลอย่างน้อย 10 ตัวอักษร ว่าทำไมถึงขอดูตัวตน';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_hr_id AND role IN ('hr', 'admin')) THEN
        RAISE EXCEPTION 'เฉพาะผู้ใช้ role=hr หรือ admin เท่านั้นที่เปิดดูได้';
    END IF;

    -- เขียน log ก่อนเสมอ ไม่ใช่หลัง
    INSERT INTO reveal_events (candidate_id, hr_id, job_id, reason)
    VALUES (p_candidate_id, p_hr_id, p_job_id, p_reason)
    RETURNING reveal_events.revealed_at INTO v_at;

    RETURN QUERY
    SELECT ci.full_name, ci.university, ci.faculty, ci.gpa, v_at
    FROM candidate_identity ci
    WHERE ci.user_id = p_candidate_id;
END $$;

REVOKE ALL ON FUNCTION public.reveal_candidate_identity(uuid, uuid, text, uuid) FROM PUBLIC, anon;


-- ---------------------------------------------------------------------
-- 6. กันแก้ log ย้อนหลัง — log ที่ลบได้ ไม่ใช่ log
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_reveal_tampering()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'reveal_events แก้หรือลบไม่ได้ — เป็นหลักฐานการตรวจสอบ';
END $$;

DROP TRIGGER IF EXISTS no_update_reveal ON public.reveal_events;
CREATE TRIGGER no_update_reveal
    BEFORE UPDATE OR DELETE ON public.reveal_events
    FOR EACH ROW EXECUTE FUNCTION public.block_reveal_tampering();


-- ---------------------------------------------------------------------
-- 7. ตรวจว่าปิดรูครบแล้ว
--    ควรได้ rls_enabled = true ทุกแถว
-- ---------------------------------------------------------------------
-- SELECT tablename, rowsecurity AS rls_enabled
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY rowsecurity, tablename;

-- ตารางไหนที่ anon ยังอ่านได้บ้าง (ควรมีแค่ 4 ตารางสาธารณะ)
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'anon' AND table_schema = 'public' ORDER BY table_name;
