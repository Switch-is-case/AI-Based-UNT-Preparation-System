-- ============================================================
-- UNT Preparation Platform — Database Schema
-- PostgreSQL
-- ============================================================

-- ── Users ──
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    language VARCHAR(5) DEFAULT 'ru' CHECK (language IN ('ru', 'kk', 'en')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Subjects ──
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name_ru VARCHAR(100) NOT NULL,
    name_kk VARCHAR(100),
    name_en VARCHAR(100),
    icon VARCHAR(50) DEFAULT '📚',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Tests ──
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title_ru VARCHAR(200) NOT NULL,
    title_kk VARCHAR(200),
    title_en VARCHAR(200),
    description_ru TEXT,
    description_kk TEXT,
    description_en TEXT,
    time_limit INTEGER DEFAULT 60, -- minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Questions ──
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    text_ru TEXT NOT NULL,
    text_kk TEXT,
    text_en TEXT,
    type VARCHAR(20) DEFAULT 'single' CHECK (type IN ('single', 'multiple')),
    difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    explanation_ru TEXT,
    explanation_kk TEXT,
    explanation_en TEXT,
    order_num INTEGER DEFAULT 0,
    variant_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Options (Answer Choices) ──
CREATE TABLE IF NOT EXISTS options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    text_ru VARCHAR(500) NOT NULL,
    text_kk VARCHAR(500),
    text_en VARCHAR(500),
    is_correct BOOLEAN DEFAULT false,
    order_num INTEGER DEFAULT 0
);

-- ── Test Attempts ──
CREATE TABLE IF NOT EXISTS test_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    time_spent INTEGER, -- seconds
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

-- ── Question Answers ──
CREATE TABLE IF NOT EXISTS question_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    is_correct BOOLEAN DEFAULT false,
    is_skipped BOOLEAN DEFAULT false,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── AI Feedbacks ──
CREATE TABLE IF NOT EXISTS ai_feedbacks (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES test_attempts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    weak_topics TEXT,
    recommendations TEXT,
    explanation TEXT,
    language VARCHAR(5) DEFAULT 'ru',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON question_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_attempt ON ai_feedbacks(attempt_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_user ON ai_feedbacks(user_id);

-- ============================================================
-- Views
-- ============================================================

-- Student performance overview
CREATE OR REPLACE VIEW student_performance_view AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COUNT(ta.id) AS total_attempts,
    COALESCE(AVG(
        CASE WHEN ta.total_questions > 0
            THEN (ta.score::DECIMAL / ta.total_questions) * 100
            ELSE 0
        END
    ), 0) AS avg_score_percent,
    COALESCE(MAX(
        CASE WHEN ta.total_questions > 0
            THEN (ta.score::DECIMAL / ta.total_questions) * 100
            ELSE 0
        END
    ), 0) AS best_score_percent,
    MAX(ta.finished_at) AS last_attempt_at
FROM users u
LEFT JOIN test_attempts ta ON u.id = ta.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.username, u.email;

-- Weak topics analysis
CREATE OR REPLACE VIEW weak_topics_view AS
SELECT
    ta.user_id,
    s.id AS subject_id,
    s.name_ru AS subject_name,
    COUNT(qa.id) AS total_answers,
    SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END) AS correct_answers,
    SUM(CASE WHEN qa.is_skipped THEN 1 ELSE 0 END) AS skipped_answers,
    ROUND(
        (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(qa.id), 0)) * 100, 1
    ) AS accuracy_percent
FROM question_answers qa
JOIN test_attempts ta ON qa.attempt_id = ta.id
JOIN questions q ON qa.question_id = q.id
JOIN tests t ON q.test_id = t.id
JOIN subjects s ON t.subject_id = s.id
GROUP BY ta.user_id, s.id, s.name_ru;

-- ============================================================
-- Seed Data
-- ============================================================

-- Default admin user (password: admin123)
-- Hash will be generated at runtime, this is a placeholder
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin', 'admin@unt.kz', '$argon2id$v=19$m=65536,t=3,p=4$0h9nEBdSTRWnKdHe6YqpxA$cPBmbXAyz1TCXjLpF9/xTc7JmfO1yQc45JFMIIX/BZ4', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Subjects
INSERT INTO subjects (name_ru, name_kk, name_en, icon)
SELECT * FROM (VALUES
    ('Математическая грамотность', 'Математикалық сауаттылық', 'Mathematical Literacy', '📐'),
    ('Грамотность чтения', 'Оқу сауаттылығы', 'Reading Literacy', '📖'),
    ('История Казахстана', 'Қазақстан тарихы', 'History of Kazakhstan', '🏛️'),
    ('Математика', 'Математика', 'Mathematics', '🔢'),
    ('Физика', 'Физика', 'Physics', '⚡'),
    ('Химия', 'Химия', 'Chemistry', '🧪'),
    ('Биология', 'Биология', 'Biology', '🧬'),
    ('Английский язык', 'Ағылшын тілі', 'English Language', '🇬🇧'),
    ('Информатика', 'Информатика', 'Computer Science', '💻'),
    ('География', 'География', 'Geography', '🌍')
) AS t(name_ru, name_kk, name_en, icon)
WHERE NOT EXISTS (SELECT 1 FROM subjects LIMIT 1);

-- Tests (one per subject, skip if any tests already exist)
INSERT INTO tests (subject_id, title_ru, title_kk, title_en)
SELECT * FROM (VALUES
    (1, 'Тест по математической грамотности', 'Математикалық сауаттылық тесті', 'Mathematical Literacy Test'),
    (2, 'Тест по грамотности чтения', 'Оқу сауаттылығы тесті', 'Reading Literacy Test'),
    (3, 'Тест по истории Казахстана', 'Қазақстан тарихы тесті', 'History of Kazakhstan Test'),
    (4, 'Тест по математике', 'Математика тесті', 'Mathematics Test'),
    (5, 'Тест по физике', 'Физика тесті', 'Physics Test'),
    (6, 'Тест по химии', 'Химия тесті', 'Chemistry Test'),
    (7, 'Тест по биологии', 'Биология тесті', 'Biology Test'),
    (8, 'Тест по английскому языку', 'Ағылшын тілі тесті', 'English Language Test'),
    (9, 'Тест по информатике', 'Информатика тесті', 'Computer Science Test'),
    (10, 'Тест по географии', 'География тесті', 'Geography Test')
) AS t(subject_id, title_ru, title_kk, title_en)
WHERE NOT EXISTS (SELECT 1 FROM tests LIMIT 1);
