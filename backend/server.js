const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting on auth/OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting on complaint submission
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many complaints from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware - allow frontend origin(s); comma-separated for multiple (e.g. preview + prod)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

// In production, if CLIENT_URL not set, allow *.onrender.com origins (common when deploying to Render)
const isProduction = process.env.NODE_ENV === 'production';
const allowRenderOrigins = isProduction && !process.env.CLIENT_URL;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (allowRenderOrigins && origin.endsWith('.onrender.com')) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));


// Apply rate limiting to auth, OTP, and complaint submission endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/complaints/send-email-otp', authLimiter);
app.use('/api/complaints/verify-email-otp', authLimiter);
app.use('/api/complaints', complaintLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/facilities', require('./routes/facilities'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/management', require('./routes/management'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Complaint Portal API running' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.expose ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { error: err.message })
  });
});

// Auto-close stale resolved tickets (resolved for >7 days → closed)
async function autoCloseStaleTickets() {
  try {
    const Complaint = require('./models/Complaint');
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await Complaint.updateMany(
      { status: 'resolved', resolvedAt: { $lte: cutoff } },
      { $set: { status: 'closed', closedAt: new Date() },
        $push: { activityLog: { action: 'Auto-closed (stale)', performedBy: 'System', performedByRole: 'system', timestamp: new Date(), notes: 'Ticket resolved for over 7 days.' } }
      }
    );
    if (result.modifiedCount > 0) console.log(`🕐 Auto-closed ${result.modifiedCount} stale resolved tickets`);
  } catch (err) {
    console.error('Auto-close cron failed:', err);
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    // Run auto-close once on startup, then every 6 hours
    autoCloseStaleTickets();
    setInterval(autoCloseStaleTickets, 6 * 60 * 60 * 1000);
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
