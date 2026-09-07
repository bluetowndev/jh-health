const express = require('express');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - All users (admin only)
router.get('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/engineers - All engineers (for assignment dropdown)
router.get('/engineers', protect, async (req, res) => {
  try {
    const engineers = await User.find({ role: 'engineer', isActive: true }).select('name email assignedDistricts teamLeadId');
    res.json(engineers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/districts - All unique districts from engineers (for district selection)
router.get('/districts', protect, async (req, res) => {
  try {
    const result = await User.aggregate([
      { $match: { role: 'engineer', isActive: true } },
      { $unwind: '$assignedDistricts' },
      { $group: { _id: '$assignedDistricts' } },
      { $sort: { _id: 1 } }
    ]);
    res.json(result.map(r => r._id));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/users/team-leads - All team leads (for TL dropdown when creating engineers)
router.get('/team-leads', protect, requireRole('admin'), async (req, res) => {
  try {
    const teamLeads = await User.find({ role: 'teamLead', isActive: true }).select('name email assignedDistricts');
    res.json(teamLeads);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/users/me/districts - Team lead updates own assigned districts (must be before /:id)
router.patch('/me/districts', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const { assignedDistricts } = req.body;
    if (!Array.isArray(assignedDistricts)) {
      return res.status(400).json({ message: 'assignedDistricts must be an array' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { assignedDistricts },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Districts updated', assignedDistricts: user.assignedDistricts });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/users/:id - Update user (admin)
router.patch('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, assignedDistricts, isActive, teamLeadId, role } = req.body;
    const update = { name, assignedDistricts, isActive };
    if (teamLeadId !== undefined) update.teamLeadId = teamLeadId || null;
    if (role) update.role = role;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/users/:id - Soft delete (admin)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
