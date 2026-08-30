-- =====================================================================
-- คนตรงปก — ข้อมูลตั้งต้น
--
--   psql "$DATABASE_URL" -f db/003_seed.sql
--
-- รันซ้ำได้ (ON CONFLICT DO UPDATE) — แก้ค่าแล้วรันใหม่ทับได้เลย
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. นิยามเกม 4 ตัว
--
-- axis_weights ต้องตรงกับสูตรใน ai/scoring/radar.py ซึ่งพอร์ตมาจาก
-- frontend/src/analytics/pipeline.ts ของพี่ฟรอง
-- ตัวเลขคือผลรวมน้ำหนักที่เกมนั้นส่งเข้าแต่ละแกน
--
-- ตัวอย่าง riskTolerance = bartRiskAcumen*0.50 + pggTrust*0.30 + bartExplosionTolerance*0.20
--   -> bart ส่งเข้า riskTolerance รวม 0.70, pgg ส่ง 0.30
--
-- duration_sec เป็นค่าประมาณจากจำนวน trial ยังไม่ได้จับเวลาจริง
-- ต้องวัดจากกลุ่มตัวอย่างแล้วมาแก้ (ดู train/labeling_guide.md เรื่องเก็บ norm)
-- ---------------------------------------------------------------------
INSERT INTO game_definitions (code, name_th, duration_sec, axis_weights) VALUES
(
    'game1_bart', 'สูบลูกโป่ง (BART)', 180,
    '{
        "axes": {"riskTolerance": 0.70, "decisionMakingUnderPressure": 0.30},
        "metrics": ["adjustedAveragePumps", "explodedTrialsCount", "postExplosionAdaptationDelta"],
        "measures": "ความกล้าเสี่ยง และการปรับตัวหลังพลาด"
    }'::jsonb
),
(
    'game2_wcst', 'เรียงไพ่เปลี่ยนกฎ (WCST)', 300,
    '{
        "axes": {"learningAgility": 1.00, "criticalThinking": 0.15},
        "metrics": ["perseverativeErrors", "categoriesCompleted", "trialsToFirstCategory", "failureToMaintainSet"],
        "measures": "ความเร็วในการจับกฎใหม่ และการเลิกใช้กฎเก่าที่ไม่เวิร์คแล้ว"
    }'::jsonb
),
(
    'game3_flanker', 'กดตามลูกศรกลาง (Flanker)', 240,
    '{
        "axes": {"criticalThinking": 0.85, "decisionMakingUnderPressure": 0.70, "resilienceAndAdaptability": 0.30},
        "metrics": ["flankerEffectMs", "incongruentAccuracy", "impulsiveErrorCount", "postErrorSlowingMs"],
        "measures": "สมาธิภายใต้สิ่งรบกวน และการตั้งหลักหลังทำผิด"
    }'::jsonb
),
(
    'game4_pgg', 'ลงขันกองกลาง (PGG)', 180,
    '{
        "axes": {"collaborationMindset": 1.00, "resilienceAndAdaptability": 0.70, "riskTolerance": 0.30},
        "metrics": ["initialContribution", "averageContribution", "freeRiderSensitivity", "cooperationDecaySlope"],
        "measures": "ความร่วมมือ ความไว้ใจ และการตั้งขอบเขตเมื่อเจอคนเอาเปรียบ"
    }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    name_th      = EXCLUDED.name_th,
    duration_sec = EXCLUDED.duration_sec,
    axis_weights = EXCLUDED.axis_weights;


-- ---------------------------------------------------------------------
-- 2. บริษัทตัวอย่างสำหรับ demo
--    ชื่อสมมติทั้งหมด ไม่ใช่บริษัทจริง — ห้ามใส่ชื่อบริษัทจริงลงข้อมูล demo
-- ---------------------------------------------------------------------
INSERT INTO companies (id, name, industry, verified) VALUES
('11111111-1111-4111-8111-111111111101', 'บริษัท เดโมเทค จำกัด',      'เทคโนโลยี',   true),
('11111111-1111-4111-8111-111111111102', 'บริษัท ตัวอย่างค้าปลีก จำกัด', 'ค้าปลีก',     true),
('11111111-1111-4111-8111-111111111103', 'บริษัท สมมติการเงิน จำกัด',   'การเงิน',     true),
('11111111-1111-4111-8111-111111111104', 'บริษัท ทดสอบครีเอทีฟ จำกัด',  'สื่อโฆษณา',   true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;


-- ---------------------------------------------------------------------
-- 3. ประกาศงานตัวอย่าง
--
-- trait_profile = โปรไฟล์ที่ตำแหน่งนี้ต้องการ (0-100 ตามสเกลเดียวกับ radar)
-- ใช้จับคู่กับ radar_profiles ของผู้สมัคร
-- ---------------------------------------------------------------------
INSERT INTO jobs (id, company_id, title, description, trait_profile, is_open) VALUES
(
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    'Junior Backend Developer',
    'ดูแล API และฐานข้อมูล ทำงานกับทีม 4-6 คน ไม่จำเป็นต้องมีประสบการณ์ตรง',
    '{"criticalThinking": 75, "learningAgility": 80, "collaborationMindset": 65, "decisionMakingUnderPressure": 60}'::jsonb,
    true
),
(
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8111-111111111102',
    'ผู้ช่วยผู้จัดการร้าน',
    'ดูแลหน้าร้าน จัดตารางพนักงาน และบริหารสต๊อก',
    '{"decisionMakingUnderPressure": 80, "collaborationMindset": 75, "resilienceAndAdaptability": 70, "riskTolerance": 45}'::jsonb,
    true
),
(
    '22222222-2222-4222-8222-222222222203',
    '11111111-1111-4111-8111-111111111103',
    'Junior Data Analyst',
    'วิเคราะห์ข้อมูลลูกค้า ทำแดชบอร์ด และสรุปให้ทีมธุรกิจ',
    '{"criticalThinking": 85, "learningAgility": 70, "collaborationMindset": 55, "riskTolerance": 35}'::jsonb,
    true
),
(
    '22222222-2222-4222-8222-222222222204',
    '11111111-1111-4111-8111-111111111104',
    'Content & Social Media Executive',
    'วางแผนคอนเทนต์ ดูแลเพจ และตอบลูกค้า',
    '{"collaborationMindset": 80, "resilienceAndAdaptability": 75, "learningAgility": 70, "riskTolerance": 60}'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    title         = EXCLUDED.title,
    description   = EXCLUDED.description,
    trait_profile = EXCLUDED.trait_profile;


-- ---------------------------------------------------------------------
-- 4. ตรวจว่าข้อมูลตั้งต้นขึ้นครบ
-- ---------------------------------------------------------------------
-- SELECT code, name_th, duration_sec,
--        jsonb_object_keys(axis_weights->'axes') AS แกนที่ป้อน
-- FROM game_definitions ORDER BY code;
--
-- SELECT c.name, j.title, j.trait_profile
-- FROM jobs j JOIN companies c ON c.id = j.company_id ORDER BY c.name;
