-- =====================================================================
-- คนตรงปก (KhonTongPok) — core schema   |   Postgres 15+ / pgvector
--
-- ออกแบบรอบ 3 ข้อผูกมัดที่ทีมตกลงกันไว้:
--   1. ซ่อนตัวตนเพื่อลดอคติ   -> candidate_identity แยกตาราง + reveal_events
--   2. ทุกทักษะต้องมีหลักฐาน  -> extracted_skills ผูก evidence_sources + offset
--   3. เก็บพัฒนาการตั้งแต่ปี 1 -> skill_levels + ทุก session มี timestamp
--
--   psql "$DATABASE_URL" -f db/001_schema.sql
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ตัวตน / การซ่อนอคติ
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('candidate', 'hr', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text UNIQUE NOT NULL,
    role        user_role NOT NULL DEFAULT 'candidate',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ตารางนี้แยกออกมา "โดยเจตนา" — role=hr ต้องไม่มีสิทธิ์ SELECT
-- ทุกฟิลด์ในนี้คือสิ่งที่ทีมโหวตกันว่าต้องซ่อน (ครีมเสนอ 3 ส.ค. ทีมเห็นด้วยทั้งหมด)
CREATE TABLE IF NOT EXISTS candidate_identity (
    user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name   text,
    birth_date  date,
    gender      text,
    gpa         numeric(3,2),
    university  text,
    faculty     text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- สิ่งที่ HR เห็นในด่านแรก — ไม่มีอะไรระบุตัวตนได้
CREATE TABLE IF NOT EXISTS candidate_profile (
    user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_alias  text NOT NULL,            -- เช่น "ผู้สมัคร #A83F"
    headline       text,
    about          text,
    year_of_study  smallint,                 -- ชั้นปีเก็บได้ ไม่ใช่ตัวระบุตัวตน
    open_to_work   boolean NOT NULL DEFAULT true,
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- หลักฐานว่าเรา blind จริง: ใครเปิดดูตัวตนใคร ตอนไหน เพราะอะไร
-- ตารางนี้ demo สดให้กรรมการดูได้ว่ากดแล้วมันขึ้น log จริง
CREATE TABLE IF NOT EXISTS reveal_events (
    id            bigserial PRIMARY KEY,
    candidate_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hr_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id        uuid,
    reason        text NOT NULL,
    revealed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reveal_events_idx1 ON reveal_events (candidate_id, revealed_at DESC);

-- ---------------------------------------------------------------------
-- 2. ทักษะ + หลักฐาน
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE skill_type AS ENUM ('hard', 'soft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE evidence_kind AS ENUM ('resume', 'chat', 'game', 'certificate', 'project');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE skill_status AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS skill_taxonomy (
    id         serial PRIMARY KEY,
    code       text UNIQUE NOT NULL,
    name_th    text NOT NULL,
    name_en    text NOT NULL,
    type       skill_type NOT NULL,
    esco_uri   text,                          -- map กลับไป ESCO ได้
    parent_id  integer REFERENCES skill_taxonomy(id),
    embedding  vector(768)                    -- CLS จาก WangchanBERTa
);
CREATE INDEX IF NOT EXISTS skill_taxonomy_idx1 ON skill_taxonomy USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS evidence_sources (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        evidence_kind NOT NULL,
    raw_text    text,                          -- text จาก PDF หรือ transcript
    file_url    text,
    ocr_used    boolean NOT NULL DEFAULT false, -- OCR มี error สูงกว่า ต้องแยกวิเคราะห์
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_sources_idx1 ON evidence_sources (user_id, created_at DESC);

-- char_start/char_end คือหัวใจ: ทำให้กด "ทักษะนี้มาจากไหน"
-- แล้วไฮไลต์กลับไปที่ประโยคต้นทางได้ = demo moment ที่พิสูจน์คำว่า "ตรงปก"
CREATE TABLE IF NOT EXISTS extracted_skills (
    id             bigserial PRIMARY KEY,
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id       integer REFERENCES skill_taxonomy(id),
    source_id      uuid NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
    surface_text   text NOT NULL,              -- คำที่โมเดลเจอจริง เช่น "ดูแล stock"
    span_label     text NOT NULL,              -- SKILL | KNOW
    char_start     integer NOT NULL,
    char_end       integer NOT NULL,
    confidence     real NOT NULL,
    status         skill_status NOT NULL DEFAULT 'pending',
    model_version  text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extracted_skills_idx1 ON extracted_skills (user_id, status);
CREATE INDEX IF NOT EXISTS extracted_skills_idx2 ON extracted_skills (skill_id);

-- ทักษะโตขึ้นตามเวลา = Growth Portfolio ที่นุ่มเสนอไว้ตั้งแต่ไอเดียแรก
CREATE TABLE IF NOT EXISTS skill_levels (
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id        integer NOT NULL REFERENCES skill_taxonomy(id),
    level           smallint NOT NULL CHECK (level BETWEEN 1 AND 5),
    evidence_count  integer NOT NULL DEFAULT 0,
    last_updated    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, skill_id)
);

-- ---------------------------------------------------------------------
-- 3. เกม + คะแนน   (ตรงกับ frontend/src/games/* ของพี่ฟรอง)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS game_definitions (
    id             serial PRIMARY KEY,
    code           text UNIQUE NOT NULL,      -- game1_bart | game2_wcst | game3_flanker | game4_pgg
    name_th        text NOT NULL,
    duration_sec   integer NOT NULL,
    axis_weights   jsonb NOT NULL,            -- สูตรใน ai/scoring/radar.py
    is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS game_sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
    client_session_id text NOT NULL,          -- sessionId ที่ frontend ส่งมา
    game_code    text NOT NULL REFERENCES game_definitions(code),
    started_at   timestamptz NOT NULL,
    finished_at  timestamptz,
    device       text,
    is_practice  boolean NOT NULL DEFAULT false,
    -- ใช้ปรับ bias ตามงานวิจัย 2025: คนเล่นเกมบ่อยได้เปรียบในเกมวัด cognitive
    self_reported_gaming_hours smallint
);
CREATE INDEX IF NOT EXISTS game_sessions_idx1 ON game_sessions (client_session_id);
CREATE INDEX IF NOT EXISTS game_sessions_idx2 ON game_sessions (user_id, started_at DESC);

-- trials/rounds ดิบจาก payload — เก็บไว้ re-score ย้อนหลังได้เมื่อสูตรเปลี่ยน
CREATE TABLE IF NOT EXISTS game_trials (
    id          bigserial PRIMARY KEY,
    session_id  uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    trial_index integer NOT NULL,
    payload     jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS game_trials_idx1 ON game_trials (session_id, trial_index);

-- summaryMetrics ที่ frontend คำนวณมาแล้ว แตกเป็นแถวเพื่อทำสถิติได้ง่าย
CREATE TABLE IF NOT EXISTS game_metrics (
    session_id  uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    metric_key  text NOT NULL,                -- adjustedAveragePumps | flankerEffectMs | ...
    value       double precision NOT NULL,
    PRIMARY KEY (session_id, metric_key)
);

-- ค่า mean/std ของกลุ่มอ้างอิง — ต้องมีก่อนถึงจะพูดคำว่า percentile ได้
CREATE TABLE IF NOT EXISTS norm_versions (
    id           serial PRIMARY KEY,
    name         text UNIQUE NOT NULL,        -- 'pilot-2026-09'
    n_samples    integer NOT NULL,
    stats        jsonb NOT NULL,              -- {"riskTolerance": {"mean": x, "std": y}}
    computed_at  timestamptz NOT NULL DEFAULT now(),
    is_active    boolean NOT NULL DEFAULT false
);
-- ให้ active ได้ทีละเวอร์ชันเดียว กันคะแนนคนละชุดปนกัน
CREATE UNIQUE INDEX IF NOT EXISTS one_active_norm ON norm_versions (is_active) WHERE is_active;

CREATE TABLE IF NOT EXISTS radar_profiles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid REFERENCES users(id) ON DELETE CASCADE,
    client_session_id text NOT NULL,
    axes              jsonb NOT NULL,         -- 6 แกน 0-100
    sub_scores        jsonb NOT NULL,         -- คะแนนย่อย ใช้ตอบ "ทำไมได้คะแนนนี้"
    overall_index     real NOT NULL,
    norm_version_id   integer REFERENCES norm_versions(id),
    computed_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS radar_profiles_idx1 ON radar_profiles (user_id, computed_at DESC);

-- ---------------------------------------------------------------------
-- 4. งาน + การจับคู่
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS companies (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name      text NOT NULL,
    industry  text,
    verified  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS jobs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title            text NOT NULL,
    description      text,
    required_skills  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{skill_id, weight}]
    trait_profile    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"riskTolerance": 60}
    embedding        vector(768),
    is_open          boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_idx1 ON jobs USING hnsw (embedding vector_cosine_ops);

-- breakdown = อธิบายได้ว่าทำไมได้คะแนนนี้ ถ้าไม่มีก็เคลม "ลดอคติ" ไม่ได้
CREATE TABLE IF NOT EXISTS matches (
    job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score        real NOT NULL,
    breakdown    jsonb NOT NULL,
    computed_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (job_id, user_id)
);
CREATE INDEX IF NOT EXISTS matches_idx1 ON matches (job_id, score DESC);

-- ---------------------------------------------------------------------
-- 5. บทสนทนากับน้องตรงปก
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_sessions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
    started_at  timestamptz NOT NULL DEFAULT now(),
    ended_at    timestamptz,
    llm_model   text                           -- typhoon-v2.5-30b-a3b-instruct
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          bigserial PRIMARY KEY,
    session_id  uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_idx1 ON chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------
-- 6. reproducibility — ทุกคะแนนต้องรู้ว่ามาจากโมเดลเวอร์ชันไหน
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS model_versions (
    id          serial PRIMARY KEY,
    name        text NOT NULL,                 -- 'skill-ner'
    version     text NOT NULL,                 -- 'v1'
    base_model  text NOT NULL,                 -- airesearch/wangchanberta-... | clicknext/phayathaibert
    f1          real,
    precision_  real,
    recall      real,
    n_train     integer,
    n_test      integer,
    trained_at  timestamptz NOT NULL DEFAULT now(),
    notes       text,
    UNIQUE (name, version)
);
