const pool = require('../config/db');
const { invalidateCache } = require('../middleware/cache');

/**
 * Helper: get localized column suffix
 */
function getLangSuffix(req) {
  const lang = req.headers['accept-language'] || 'ru';
  if (['kk', 'en'].includes(lang)) return `_${lang}`;
  return '_ru';
}

/**
 * GET /api/admin/students — list all students
 */
async function getStudents(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, username, email, language, created_at,
             (SELECT COUNT(*) FROM test_attempts ta WHERE ta.user_id = users.id) AS attempts_count
      FROM users
      WHERE role = 'student'
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

/**
 * GET /api/admin/subjects — list all subjects
 */
async function getSubjects(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name_ru, name_kk, name_en, icon FROM subjects WHERE is_active = true ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

/**
 * GET /api/admin/tests — list tests, optionally filtered by subject
 */
async function getTests(req, res) {
  try {
    const { subjectId } = req.query;
    let query = 'SELECT id, subject_id, title_ru, title_kk, title_en FROM tests WHERE is_active = true';
    const params = [];
    if (subjectId) {
      query += ' AND subject_id = $1';
      params.push(subjectId);
    }
    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get tests error:', err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
}

/**
 * GET /api/admin/questions — list all questions
 */
async function getQuestions(req, res) {
  try {
    const { testId } = req.query;
    let query = `
      SELECT q.id, q.text_ru, q.text_kk, q.text_en, q.type, q.difficulty, q.order_num, q.variant_number,
             t.title_ru AS test_title, s.name_ru AS subject_name
      FROM questions q
      JOIN tests t ON q.test_id = t.id
      JOIN subjects s ON t.subject_id = s.id
    `;
    const params = [];
    if (testId) {
      query += ' WHERE q.test_id = $1';
      params.push(testId);
    }
    query += ' ORDER BY q.test_id, q.order_num, q.id';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

/**
 * POST /api/admin/questions — create a question with options
 * Body: { testId, textRu, textKk, textEn, type, difficulty, options: [{ textRu, textKk, textEn, isCorrect }] }
 */
async function createQuestion(req, res) {
  const client = await pool.connect();
  try {
    const { testId, textRu, textKk, textEn, type, difficulty, explanationRu, explanationKk, explanationEn, orderNum, variantNumber, options } = req.body;

    if (!testId || !textRu || !options || options.length < 2) {
      return res.status(400).json({ error: 'testId, textRu, and at least 2 options are required' });
    }

    await client.query('BEGIN');

    const qResult = await client.query(
      `INSERT INTO questions (test_id, text_ru, text_kk, text_en, type, difficulty, explanation_ru, explanation_kk, explanation_en, order_num, variant_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [testId, textRu, textKk || null, textEn || null, type || 'single', difficulty || 'medium',
       explanationRu || null, explanationKk || null, explanationEn || null,
       orderNum || 0, variantNumber || null]
    );
    const questionId = qResult.rows[0].id;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      await client.query(
        `INSERT INTO options (question_id, text_ru, text_kk, text_en, is_correct, order_num)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [questionId, opt.textRu, opt.textKk || null, opt.textEn || null, opt.isCorrect || false, i]
      );
    }

    await client.query('COMMIT');
    invalidateCache('/api/tests');
    res.status(201).json({ message: 'Question created', questionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create question error:', err);
    res.status(500).json({ error: 'Failed to create question' });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/admin/questions/:id — update a question
 */
async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
    const { textRu, textKk, textEn, type, difficulty, explanationRu, explanationKk, explanationEn } = req.body;

    await pool.query(
      `UPDATE questions SET text_ru = COALESCE($1, text_ru), text_kk = COALESCE($2, text_kk),
       text_en = COALESCE($3, text_en), type = COALESCE($4, type), difficulty = COALESCE($5, difficulty),
       explanation_ru = COALESCE($6, explanation_ru), explanation_kk = COALESCE($7, explanation_kk),
       explanation_en = COALESCE($8, explanation_en)
       WHERE id = $9`,
      [textRu, textKk, textEn, type, difficulty, explanationRu, explanationKk, explanationEn, id]
    );
    invalidateCache('/api/tests');
    res.json({ message: 'Question updated' });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
}

/**
 * DELETE /api/admin/questions/:id
 */
async function deleteQuestion(req, res) {
  try {
    await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
    invalidateCache('/api/tests');
    res.json({ message: 'Question deleted' });
  } catch (err) {
    console.error('Delete question error:', err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
}

/**
 * POST /api/admin/tests — create a test
 */
async function createTest(req, res) {
  try {
    const { subjectId, titleRu, titleKk, titleEn, descriptionRu, descriptionKk, descriptionEn, timeLimit } = req.body;

    if (!subjectId || !titleRu) {
      return res.status(400).json({ error: 'subjectId and titleRu are required' });
    }

    const result = await pool.query(
      `INSERT INTO tests (subject_id, title_ru, title_kk, title_en, description_ru, description_kk, description_en, time_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [subjectId, titleRu, titleKk || null, titleEn || null, descriptionRu || null, descriptionKk || null, descriptionEn || null, timeLimit || 60]
    );

    invalidateCache('/api/tests');
    res.status(201).json({ message: 'Test created', testId: result.rows[0].id });
  } catch (err) {
    console.error('Create test error:', err);
    res.status(500).json({ error: 'Failed to create test' });
  }
}

/**
 * DELETE /api/admin/tests/:id
 */
async function deleteTest(req, res) {
  try {
    await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
    invalidateCache('/api/tests');
    res.json({ message: 'Test deleted' });
  } catch (err) {
    console.error('Delete test error:', err);
    res.status(500).json({ error: 'Failed to delete test' });
  }
}

/**
 * GET /api/admin/stats — dashboard statistics
 */
async function getStats(req, res) {
  try {
    const [users, tests, questions, attempts] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      pool.query('SELECT COUNT(*) FROM tests WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM questions'),
      pool.query('SELECT COUNT(*) FROM test_attempts')
    ]);

    res.json({
      studentsCount: parseInt(users.rows[0].count),
      testsCount: parseInt(tests.rows[0].count),
      questionsCount: parseInt(questions.rows[0].count),
      attemptsCount: parseInt(attempts.rows[0].count)
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

/**
 * DELETE /api/admin/cleanup-duplicates — remove duplicate questions (TEMPORARY)
 * Keeps the question with the smallest id for each (text_ru, test_id) pair.
 */
async function cleanupDuplicates(req, res) {
  try {
    // First, find how many duplicates exist
    const countResult = await pool.query(`
      SELECT COUNT(*) AS total FROM questions
      WHERE id NOT IN (
        SELECT MIN(id) FROM questions GROUP BY text_ru, test_id
      )
    `);
    const duplicateCount = parseInt(countResult.rows[0].total);

    if (duplicateCount === 0) {
      return res.json({ message: 'No duplicates found', deleted: 0 });
    }

    // Delete duplicates (CASCADE will remove related options)
    const deleteResult = await pool.query(`
      DELETE FROM questions
      WHERE id NOT IN (
        SELECT MIN(id) FROM questions GROUP BY text_ru, test_id
      )
    `);

    invalidateCache('/api/tests');
    res.json({ message: `Duplicates removed`, deleted: deleteResult.rowCount });
  } catch (err) {
    console.error('Cleanup duplicates error:', err);
    res.status(500).json({ error: 'Failed to cleanup duplicates' });
  }
}

module.exports = {
  getStudents, getSubjects, getTests, getQuestions, createQuestion, updateQuestion, deleteQuestion,
  createTest, deleteTest, getStats, cleanupDuplicates
};
