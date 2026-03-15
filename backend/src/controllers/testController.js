const pool = require('../config/db');
const { invalidateCache } = require('../middleware/cache');
const aiService = require('../services/aiService');

/**
 * Helper: get localized column name based on Accept-Language header
 */
function getLangSuffix(req) {
  const lang = req.headers['accept-language'] || 'ru';
  if (['kk', 'en'].includes(lang)) return `_${lang}`;
  return '_ru';
}

/**
 * GET /api/tests — list all active tests with subject info
 */
async function getAllTests(req, res) {
  try {
    const lang = getLangSuffix(req);
    const result = await pool.query(`
      SELECT t.id, t.title${lang} AS title, t.description${lang} AS description, 
             t.time_limit, t.is_active,
             s.name${lang} AS subject_name, s.icon AS subject_icon, s.id AS subject_id,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.is_active = true
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get tests error:', err);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
}

/**
 * GET /api/tests/subjects — list all subjects
 */
async function getSubjects(req, res) {
  try {
    const lang = getLangSuffix(req);
    const result = await pool.query(`
      SELECT s.id, s.name${lang} AS name, s.icon,
             (SELECT COUNT(*) FROM tests t WHERE t.subject_id = s.id AND t.is_active = true) AS test_count
      FROM subjects s
      WHERE s.is_active = true
      ORDER BY s.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
}

/**
 * GET /api/tests/:id — get test details
 */
async function getTestById(req, res) {
  try {
    const lang = getLangSuffix(req);
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.id, t.title${lang} AS title, t.description${lang} AS description,
             t.time_limit, s.name${lang} AS subject_name, s.icon AS subject_icon,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) AS question_count
      FROM tests t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get test error:', err);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
}

/**
 * GET /api/tests/:id/questions — get questions for a test
 */
async function getTestQuestions(req, res) {
  try {
    const lang = getLangSuffix(req);
    const { id } = req.params;
    
    const questions = await pool.query(`
      SELECT q.id, q.text${lang} AS text, q.type, q.difficulty, q.order_num
      FROM questions q
      WHERE q.test_id = $1
      ORDER BY q.order_num, q.id
    `, [id]);

    // Get options for each question
    const questionIds = questions.rows.map(q => q.id);
    if (questionIds.length === 0) {
      return res.json([]);
    }

    const options = await pool.query(`
      SELECT o.id, o.question_id, o.text${lang} AS text, o.order_num
      FROM options o
      WHERE o.question_id = ANY($1)
      ORDER BY o.order_num, o.id
    `, [questionIds]);

    // Group options by question
    const optionsMap = {};
    options.rows.forEach(opt => {
      if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
      optionsMap[opt.question_id].push({ id: opt.id, text: opt.text });
    });

    const result = questions.rows.map(q => ({
      ...q,
      options: optionsMap[q.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

/**
 * POST /api/tests/submit — submit test answers
 * Body: { testId, answers: [{ questionId, selectedOptionId, isSkipped }], timeSpent }
 */
async function submitTest(req, res) {
  const client = await pool.connect();
  try {
    const { testId, answers, timeSpent } = req.body;
    const userId = req.user.id;
    const lang = req.headers['accept-language'] || 'ru';

    if (!testId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'testId and answers array are required' });
    }

    await client.query('BEGIN');

    // Calculate score
    let score = 0;
    let skippedCount = 0;
    const wrongAnswers = [];

    for (const a of answers) {
      if (a.isSkipped) {
        skippedCount++;
        continue;
      }
      // Check if selected option is correct
      const optResult = await client.query(
        'SELECT is_correct FROM options WHERE id = $1 AND question_id = $2',
        [a.selectedOptionId, a.questionId]
      );
      if (optResult.rows.length > 0 && optResult.rows[0].is_correct) {
        a.isCorrect = true;
        score++;
      } else {
        a.isCorrect = false;
        wrongAnswers.push(a);
      }
    }

    // Create test attempt
    const attemptResult = await client.query(
      `INSERT INTO test_attempts (user_id, test_id, score, total_questions, skipped_count, time_spent, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING id`,
      [userId, testId, score, answers.length, skippedCount, timeSpent || 0]
    );
    const attemptId = attemptResult.rows[0].id;

    // Save individual answers
    for (const a of answers) {
      await client.query(
        `INSERT INTO question_answers (attempt_id, question_id, selected_option_id, is_correct, is_skipped)
         VALUES ($1, $2, $3, $4, $5)`,
        [attemptId, a.questionId, a.isSkipped ? null : a.selectedOptionId, a.isCorrect || false, a.isSkipped || false]
      );
    }

    await client.query('COMMIT');

    // Trigger AI analysis asynchronously (non-blocking)
    aiService.analyzeTest(attemptId, userId, testId, wrongAnswers, lang).catch(err => {
      console.error('AI analysis error (non-blocking):', err.message);
    });

    // Invalidate related caches
    invalidateCache(`/api/tests/history/${userId}`);
    invalidateCache('/api/tests/leaderboard');

    res.json({
      attemptId,
      score,
      total: answers.length,
      skipped: skippedCount,
      percentage: Math.round((score / answers.length) * 100)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit test error:', err);
    res.status(500).json({ error: 'Failed to submit test' });
  } finally {
    client.release();
  }
}

/**
 * GET /api/tests/results/:attemptId — get detailed results for an attempt
 */
async function getResults(req, res) {
  try {
    const lang = getLangSuffix(req);
    const { attemptId } = req.params;
    const userId = req.user.id;

    // Get attempt info
    const attempt = await pool.query(`
      SELECT ta.*, t.title${lang} AS test_title, s.name${lang} AS subject_name
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE ta.id = $1 AND ta.user_id = $2
    `, [attemptId, userId]);

    if (attempt.rows.length === 0) {
      return res.status(404).json({ error: 'Results not found' });
    }

    // Get detailed answers
    const answers = await pool.query(`
      SELECT qa.question_id, qa.selected_option_id, qa.is_correct, qa.is_skipped,
             q.text${lang} AS question_text, q.explanation${lang} AS explanation,
             sel_opt.text${lang} AS selected_text,
             cor_opt.text${lang} AS correct_text, cor_opt.id AS correct_option_id
      FROM question_answers qa
      JOIN questions q ON qa.question_id = q.id
      LEFT JOIN options sel_opt ON qa.selected_option_id = sel_opt.id
      LEFT JOIN options cor_opt ON cor_opt.question_id = q.id AND cor_opt.is_correct = true
      WHERE qa.attempt_id = $1
      ORDER BY q.order_num, q.id
    `, [attemptId]);

    // Get AI feedback if available
    const feedback = await pool.query(
      'SELECT weak_topics, recommendations, explanation FROM ai_feedbacks WHERE attempt_id = $1 ORDER BY created_at DESC LIMIT 1',
      [attemptId]
    );

    res.json({
      attempt: attempt.rows[0],
      answers: answers.rows,
      aiFeedback: feedback.rows[0] || null
    });
  } catch (err) {
    console.error('Get results error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}

/**
 * GET /api/tests/history/:userId
 */
async function getHistory(req, res) {
  try {
    const lang = getLangSuffix(req);
    const userId = req.params.userId;

    const result = await pool.query(`
      SELECT ta.id, ta.score, ta.total_questions, ta.skipped_count, ta.time_spent,
             ta.started_at, ta.finished_at,
             t.title${lang} AS test_title, s.name${lang} AS subject_name, s.icon AS subject_icon,
             ROUND((ta.score::DECIMAL / NULLIF(ta.total_questions, 0)) * 100) AS percentage
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE ta.user_id = $1
      ORDER BY ta.finished_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}

/**
 * GET /api/tests/leaderboard — top students
 */
async function getLeaderboard(req, res) {
  try {
    const result = await pool.query(`
      SELECT user_id, username, total_attempts,
             ROUND(avg_score_percent, 1) AS avg_score,
             ROUND(best_score_percent, 1) AS best_score,
             last_attempt_at
      FROM student_performance_view
      WHERE total_attempts > 0
      ORDER BY avg_score_percent DESC, total_attempts DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

module.exports = {
  getAllTests, getSubjects, getTestById, getTestQuestions,
  submitTest, getResults, getHistory, getLeaderboard
};
