const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const {
  getAllTests, getSubjects, getTestById, getTestQuestions,
  submitTest, getResults, getHistory, getLeaderboard
} = require('../controllers/testController');

// Public routes
router.get('/subjects', cacheMiddleware(300), getSubjects);
router.get('/', cacheMiddleware(120), getAllTests);
router.get('/leaderboard', cacheMiddleware(60), getLeaderboard);

// Protected routes (require JWT)
router.get('/history/:userId', authenticateToken, cacheMiddleware(60), getHistory);
router.get('/:id', cacheMiddleware(120), getTestById);
router.get('/:id/questions', authenticateToken, getTestQuestions);
router.post('/submit', authenticateToken, submitTest);
router.get('/results/:attemptId', authenticateToken, getResults);

module.exports = router;
