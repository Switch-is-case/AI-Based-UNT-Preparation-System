const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getStudents, getQuestions, createQuestion, updateQuestion, deleteQuestion,
  createTest, deleteTest, getStats
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

router.get('/stats', getStats);
router.get('/students', getStudents);
router.get('/questions', getQuestions);
router.post('/questions', createQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);
router.post('/tests', createTest);
router.delete('/tests/:id', deleteTest);

module.exports = router;
