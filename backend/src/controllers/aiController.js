const pool = require('../config/db');
const aiService = require('../services/aiService');

/**
 * POST /api/ai/chat — chat with AI tutor
 */
async function chat(req, res) {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const language = req.headers['accept-language'] || 'ru';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await aiService.chatWithAI(message, userId, language);
    res.json(result);
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'AI chat failed' });
  }
}

/**
 * GET /api/ai/learning-path/:userId — get personalized learning path
 */
async function learningPath(req, res) {
  try {
    const userId = req.params.userId;
    const language = req.headers['accept-language'] || 'ru';

    const result = await aiService.getLearningPath(userId, language);
    res.json(result);
  } catch (err) {
    console.error('Learning path error:', err);
    res.status(500).json({ error: 'Failed to generate learning path' });
  }
}

/**
 * POST /api/ai/explain — explain a specific question
 */
async function explain(req, res) {
  try {
    const { questionId } = req.body;
    const userId = req.user.id;
    const language = req.headers['accept-language'] || 'ru';

    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    const langSuffix = ['kk', 'en'].includes(language) ? `_${language}` : '_ru';

    const question = await pool.query(
      `SELECT q.text${langSuffix} AS text, q.explanation${langSuffix} AS explanation,
              (SELECT text${langSuffix} FROM options WHERE question_id = q.id AND is_correct = true LIMIT 1) AS correct_answer
       FROM questions q WHERE q.id = $1`,
      [questionId]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const q = question.rows[0];

    // If we have a stored explanation, use it
    if (q.explanation) {
      return res.json({ explanation: q.explanation });
    }

    // Otherwise, ask AI
    const prompt = language === 'en'
      ? `Explain the answer to this ENT question: "${q.text}". The correct answer is: "${q.correct_answer}". Provide a clear educational explanation.`
      : language === 'kk'
      ? `Бұл ЕНТ сұрағының жауабын түсіндіріңіз: "${q.text}". Дұрыс жауап: "${q.correct_answer}". Түсінікті білім беру түсіндірмесін беріңіз.`
      : `Объясни ответ на этот вопрос ЕНТ: "${q.text}". Правильный ответ: "${q.correct_answer}". Дай понятное учебное объяснение.`;

    const result = await aiService.chatWithAI(prompt, userId, language);
    res.json({ explanation: result.answer });
  } catch (err) {
    console.error('AI explain error:', err);
    res.status(500).json({ error: 'Failed to explain question' });
  }
}
/**
 * POST /api/ai/analyze/:attemptId — trigger AI analysis on demand
 */
async function analyzeAttempt(req, res) {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const language = req.headers['accept-language'] || 'ru';

    // Check if feedback already exists
    const existing = await pool.query(
      'SELECT id FROM ai_feedbacks WHERE attempt_id = $1 LIMIT 1',
      [attemptId]
    );
    if (existing.rows.length > 0) {
      return res.json({ message: 'Analysis already exists' });
    }

    // Get the attempt and wrong/skipped answers
    const attempt = await pool.query(
      'SELECT test_id FROM test_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, userId]
    );
    if (attempt.rows.length === 0) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const wrongAnswers = await pool.query(
      `SELECT question_id AS "questionId", selected_option_id AS "selectedOptionId", is_skipped AS "isSkipped"
       FROM question_answers WHERE attempt_id = $1 AND (is_correct = false OR is_skipped = true)`,
      [attemptId]
    );

    if (wrongAnswers.rows.length === 0) {
      return res.json({ message: 'No wrong answers to analyze' });
    }

    // Trigger analysis asynchronously
    aiService.analyzeTest(
      parseInt(attemptId), userId, attempt.rows[0].test_id,
      wrongAnswers.rows, language
    ).catch(err => console.error('AI analysis error:', err.message));

    res.json({ message: 'Analysis started' });
  } catch (err) {
    console.error('Analyze attempt error:', err);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
}

module.exports = { chat, learningPath, explain, analyzeAttempt };
