const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const { chat, learningPath, explain, analyzeAttempt } = require('../controllers/aiController');

// All AI routes require authentication
router.use(authenticateToken);

router.post('/chat', chat);
router.get('/learning-path/:userId', cacheMiddleware(120), learningPath);
router.post('/explain', explain);
router.post('/analyze/:attemptId', analyzeAttempt);

module.exports = router;
