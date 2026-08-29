-- =====================================================================
-- อัปโหลดเรซูเม่ + OCR + ลบข้อมูลส่วนตัว
--
--   psql "$DATABASE_URL" -f db/004_resume_upload.sql
--
-- ไฟล์นี้ทำ 3 อย่าง
--   1. เก็บ "อ่านมาด้วยวิธีไหน" ไว้ เพราะข้อความจาก OCR ผิดพลาดมากกว่า
--      text layer ตอนวัดผลต้องแยกกลุ่มดู ไม่งั้นสรุปผิดว่าโมเดลแย่
--   2. เก็บรายงานว่าลบข้อมูลส่วนตัวไปกี่จุด — ใช้ตอบกรรมการได้ทันทีว่า
--      "ที่บอกว่าไม่เก็บตัวตน ดูตรงนี้" โดยไม่ต้องเปิดโค้ดให้ดู
--   3. ใส่ CHECK ที่ระดับฐานข้อมูล ไม่ใช่แค่เชื่อว่าแอปจะ redact ให้
-- =====================================================================

ALTER TABLE evidence_sources
    ADD COLUMN IF NOT EXISTS filename         text,
    ADD COLUMN IF NOT EXISTS extract_method   text,
    ADD COLUMN IF NOT EXISTS n_pages          smallint,
    ADD COLUMN IF NOT EXISTS redaction_report jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN evidence_sources.extract_method IS
    'text_layer | typhoon_ocr | tesseract | docx — ocr_used ดูจากคอลัมน์นี้ได้ละเอียดกว่า';
COMMENT ON COLUMN evidence_sources.raw_text IS
    'ข้อความที่ลบข้อมูลส่วนตัวแล้วเท่านั้น ห้ามเขียนข้อความดิบลงคอลัมน์นี้ '
    'พิกัดใน extracted_skills อ้างอิงข้อความนี้ ไม่ใช่ต้นฉบับ';

-- ---------------------------------------------------------------------
-- สะพานเชื่อม id สองระบบ
--
-- ตารางของทีม (Prisma) ใช้ cuid เป็น text ส่วนตารางนี้ใช้ uuid
-- ระหว่างที่ยังไม่ได้ merge จริง ให้เก็บ cuid ไว้ในคอลัมน์แยก
-- แล้วปล่อย user_id ว่างได้ ไม่งั้น FK จะเด้งทุกครั้งที่ผู้ใช้จริงอัปโหลด
-- ---------------------------------------------------------------------
ALTER TABLE evidence_sources ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE extracted_skills ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE evidence_sources ADD COLUMN IF NOT EXISTS external_user_id text;
ALTER TABLE extracted_skills ADD COLUMN IF NOT EXISTS external_user_id text;

CREATE INDEX IF NOT EXISTS evidence_sources_ext_idx
    ON evidence_sources (external_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS extracted_skills_ext_idx
    ON extracted_skills (external_user_id, status);

-- ต้องรู้ว่าเป็นใครสักทาง จะ uuid หรือ cuid ก็ได้ แต่ห้ามว่างทั้งคู่
ALTER TABLE evidence_sources DROP CONSTRAINT IF EXISTS evidence_sources_has_owner;
ALTER TABLE evidence_sources ADD CONSTRAINT evidence_sources_has_owner
    CHECK (user_id IS NOT NULL OR external_user_id IS NOT NULL) NOT VALID;

-- ---------------------------------------------------------------------
-- ด่านสุดท้าย: ต่อให้แอปลืม redact ฐานข้อมูลก็ต้องไม่ยอมรับ
--
-- NOT VALID = บังคับเฉพาะแถวใหม่ ไม่ไปไล่ตรวจของเก่าตอน migrate
-- (ของเก่าที่หลุดมาก่อนหน้านี้ต้องล้างแยก ดูคำสั่งท้ายไฟล์)
--
-- เลือกเช็คแค่ 2 อย่างที่ "เจอแล้วแปลว่าพลาดแน่ ๆ" ไม่ใช่ทุกอย่าง
-- เพราะ CHECK ที่ false positive จะทำให้ผู้ใช้อัปโหลดไม่ได้เฉย ๆ
-- ซึ่งแย่กว่าปล่อยผ่านในกรณีคลุมเครือ
-- ---------------------------------------------------------------------
ALTER TABLE evidence_sources DROP CONSTRAINT IF EXISTS evidence_no_raw_email;
ALTER TABLE evidence_sources ADD CONSTRAINT evidence_no_raw_email
    CHECK (raw_text IS NULL OR raw_text !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
    NOT VALID;

ALTER TABLE evidence_sources DROP CONSTRAINT IF EXISTS evidence_no_thai_id;
ALTER TABLE evidence_sources ADD CONSTRAINT evidence_no_thai_id
    CHECK (raw_text IS NULL OR raw_text !~ '(^|[^0-9])[0-9]{13}([^0-9]|$)')
    NOT VALID;

-- ---------------------------------------------------------------------
-- มุมมองสำหรับ demo: "อัปโหลดกี่ไฟล์ ลบข้อมูลไปกี่จุด ใช้ OCR กี่ครั้ง"
-- เปิดหน้านี้ตอน pitch ได้เลย ไม่ต้องเขียน query สด
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW resume_upload_stats AS
SELECT
    date_trunc('day', created_at)                        AS day,
    count(*)                                             AS uploads,
    count(*) FILTER (WHERE ocr_used)                     AS used_ocr,
    count(*) FILTER (WHERE extract_method = 'typhoon_ocr') AS used_typhoon,
    sum((redaction_report->>'pii')::int)                 AS pii_removed,
    sum((redaction_report->>'bias')::int)                AS bias_removed
FROM evidence_sources
WHERE kind = 'resume'
GROUP BY 1
ORDER BY 1 DESC;

-- ---------------------------------------------------------------------
-- ถ้ามีข้อมูลเก่าที่เก็บก่อนมี redaction ให้ตรวจก่อนแล้วค่อยลบ
-- (จงใจไม่ทำให้อัตโนมัติ — การลบข้อมูลผู้ใช้ต้องมีคนกดเอง)
--
--   SELECT id, filename, left(raw_text, 80) FROM evidence_sources
--   WHERE raw_text ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}';
--
--   -- ตรวจแล้วว่าใช่ ค่อยรัน:
--   -- UPDATE evidence_sources SET raw_text = NULL WHERE id IN (...);
-- ---------------------------------------------------------------------
