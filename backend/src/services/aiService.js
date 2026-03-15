const axios = require('axios');
const pool = require('../config/db');
const redis = require('../config/redis');

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

/**
 * Send a chat message to Dify AI
 */
async function chatWithAI(message, userId, language = 'ru') {
  if (!DIFY_API_KEY) {
    return { answer: getFallbackResponse(language) };
  }

  try {
    const response = await axios.post(
      `${DIFY_API_URL}/chat-messages`,
      {
        inputs: { language },
        query: message,
        response_mode: 'blocking',
        user: `user_${userId}`
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return { answer: response.data.answer || getFallbackResponse(language) };
  } catch (err) {
    console.error('Dify API error:', err.message);
    return { answer: getFallbackResponse(language) };
  }
}

/**
 * Analyze test results and generate AI feedback (async, non-blocking)
 */
async function analyzeTest(attemptId, userId, testId, wrongAnswers, language = 'ru') {
  if (!DIFY_API_KEY || wrongAnswers.length === 0) return;

  // Check cache first
  const cacheKey = `ai:analysis:${attemptId}`;
  if (redis && redis.status === 'ready') {
    const cached = await redis.get(cacheKey);
    if (cached) return;
  }

  try {
    // Build analysis prompt
    const wrongDetails = await Promise.all(
      wrongAnswers.slice(0, 10).map(async (a) => {
        const q = await pool.query(
          `SELECT text_${language} AS text FROM questions WHERE id = $1`, [a.questionId]
        );
        const selOpt = a.selectedOptionId ? await pool.query(
          `SELECT text_${language} AS text FROM options WHERE id = $1`, [a.selectedOptionId]
        ) : { rows: [{ text: 'Skipped' }] };
        const corOpt = await pool.query(
          `SELECT text_${language} AS text FROM options WHERE question_id = $1 AND is_correct = true`, [a.questionId]
        );
        return {
          question: q.rows[0]?.text || 'Unknown',
          studentAnswer: selOpt.rows[0]?.text || 'Skipped',
          correctAnswer: corOpt.rows[0]?.text || 'Unknown'
        };
      })
    );

    const prompt = buildAnalysisPrompt(wrongDetails, language);
    const result = await chatWithAI(prompt, userId, language);

    // Parse AI response
    const weakTopics = extractSection(result.answer, 'WEAK_TOPICS') || result.answer;
    const recommendations = extractSection(result.answer, 'RECOMMENDATIONS') || '';

    // Save to database
    await pool.query(
      `INSERT INTO ai_feedbacks (attempt_id, user_id, weak_topics, recommendations, explanation, language)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attemptId, userId, weakTopics, recommendations, result.answer, language]
    );

    // Cache the analysis
    if (redis && redis.status === 'ready') {
      await redis.setex(cacheKey, 3600, 'done');
    }
  } catch (err) {
    console.error('AI analysis error:', err.message);
  }
}

/**
 * Get learning path recommendations for a user
 */
async function getLearningPath(userId, language = 'ru') {
  try {
    // Get weak topics from view
    const weakTopics = await pool.query(
      `SELECT subject_name, accuracy_percent, total_answers, correct_answers
       FROM weak_topics_view WHERE user_id = $1 ORDER BY accuracy_percent ASC`,
      [userId]
    );

    if (weakTopics.rows.length === 0) {
      return { topics: [], recommendation: getNoDataMessage(language) };
    }

    // Get AI recommendation if available
    let aiRecommendation = '';
    if (DIFY_API_KEY) {
      const topicsSummary = weakTopics.rows
        .map(t => `${t.subject_name}: ${t.accuracy_percent}% (${t.correct_answers}/${t.total_answers})`)
        .join('\n');

      const prompt = buildLearningPathPrompt(topicsSummary, language);
      const result = await chatWithAI(prompt, userId, language);
      aiRecommendation = result.answer;
    }

    return {
      topics: weakTopics.rows,
      recommendation: aiRecommendation || getDefaultRecommendation(weakTopics.rows, language)
    };
  } catch (err) {
    console.error('Learning path error:', err.message);
    return { topics: [], recommendation: '' };
  }
}

// ── Helper Functions ──

function buildAnalysisPrompt(wrongDetails, lang) {
  const langName = lang === 'kk' ? 'қазақ' : lang === 'en' ? 'English' : 'русский';
  return `Ты — преподаватель, помогающий студенту подготовиться к ЕНТ. Ответь на языке: ${langName}.

Студент допустил ошибки в следующих вопросах:
${wrongDetails.map((d, i) => `${i + 1}. Вопрос: ${d.question}\n   Ответ студента: ${d.studentAnswer}\n   Правильный ответ: ${d.correctAnswer}`).join('\n\n')}

Пожалуйста, проанализируй ошибки и дай:
[WEAK_TOPICS]
Список слабых тем
[/WEAK_TOPICS]
[RECOMMENDATIONS]
Конкретные рекомендации для улучшения
[/RECOMMENDATIONS]`;
}

function buildLearningPathPrompt(topicsSummary, lang) {
  const langName = lang === 'kk' ? 'қазақ' : lang === 'en' ? 'English' : 'русский';
  return `Составь персональный план обучения для студента ЕНТ на языке: ${langName}.

Текущая успеваемость по предметам:
${topicsSummary}

Дай конкретный план с приоритетами, временными рамками и рекомендациями.`;
}

function extractSection(text, section) {
  const regex = new RegExp(`\\[${section}\\]([\\s\\S]*?)\\[\\/${section}\\]`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function getFallbackResponse(lang) {
  const messages = {
    ru: 'AI-сервис временно недоступен. Пожалуйста, попробуйте позже.',
    kk: 'AI-қызмет уақытша қол жетімді емес. Кейінірек қайталап көріңіз.',
    en: 'AI service is temporarily unavailable. Please try again later.'
  };
  return messages[lang] || messages.ru;
}

function getNoDataMessage(lang) {
  const messages = {
    ru: 'Пройдите хотя бы один тест, чтобы получить рекомендации.',
    kk: 'Ұсыныстар алу үшін кем дегенде бір тестті тапсырыңыз.',
    en: 'Complete at least one test to get recommendations.'
  };
  return messages[lang] || messages.ru;
}

function getDefaultRecommendation(topics, lang) {
  const weakest = topics.filter(t => parseFloat(t.accuracy_percent) < 50);
  if (weakest.length === 0) {
    return lang === 'en' ? 'Great job! Keep practicing to maintain your performance.' :
           lang === 'kk' ? 'Жарайсың! Нәтижеңді сақтау үшін жаттығуды жалғастыр.' :
           'Отличная работа! Продолжайте практиковаться для поддержания результатов.';
  }
  const names = weakest.map(t => t.subject_name).join(', ');
  return lang === 'en' ? `Focus on improving: ${names}` :
         lang === 'kk' ? `Жақсартуға назар аударыңыз: ${names}` :
         `Сосредоточьтесь на улучшении: ${names}`;
}

module.exports = { chatWithAI, analyzeTest, getLearningPath };
