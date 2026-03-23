require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/authRoutes');
const testRoutes = require('./src/routes/testRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const initDb = require('./src/config/initDb');

const app = express();
const port = process.env.PORT || 3000;

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const allowedOrigins = [
      frontendUrl,
      'http://localhost:5173',
      'http://localhost:4173'
    ];
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow exact match or any *.vercel.app preview deploy
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── Rate Limiting ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tests', apiLimiter, testRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/ai', apiLimiter, aiRoutes);

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Initialize DB & Start Server ──
initDb().then(() => {
  app.listen(port, () => {
    console.log(`✅ UNT Backend running on http://localhost:${port}`);
  });
});

module.exports = app;
