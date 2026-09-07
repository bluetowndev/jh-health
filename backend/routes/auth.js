const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact admin.' });

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role, assignedDistricts: user.assignedDistricts, teamLeadId: user.teamLeadId }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/register (admin only creates engineers/admins)
router.post('/register', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role, assignedDistricts, teamLeadId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role, assignedDistricts: assignedDistricts || [], teamLeadId: teamLeadId || null });
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

module.exports = router;
