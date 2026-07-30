const express = require('express');
const bcrypt = require('bcryptjs');
const Complaint = require('../models/Complaint');
const VerificationCode = require('../models/VerificationCode');
const NotificationDirectory = require('../models/NotificationDirectory');
const assignmentService = require('../services/assignmentService');
const notificationService = require('../services/notificationService');
const Facility = require('../models/Facility');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');

const router = express.Router();

const OTP_EXPIRY_MINUTES = 15;
const EMAIL_VERIFIED_EXPIRY_MS = 30 * 60 * 1000; // 30 min
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/complaints/send-email-otp - Public (send OTP to verify email)
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const normalized = (email || '').toLowerCase().trim();
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      return res.status(400).json({ message: 'Valid email address is required' });
    }

    await VerificationCode.deleteMany({ email: normalized, type: 'registration' });
    const otpCode = generateOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await VerificationCode.create({ email: normalized, otpHash, expiry, type: 'registration' });

    try {
      const { sendRegistrationOTPEmail } = require('../utils/email');
      await sendRegistrationOTPEmail(normalized, otpCode);
    } catch (emailErr) {
      console.error('Registration OTP email failed:', emailErr);
      await VerificationCode.deleteMany({ email: normalized, type: 'registration' });
      return res.status(500).json({
        message: 'Failed to send OTP. Please check your email address and try again.',
        error: emailErr.message
      });
    }

    res.json({ message: 'OTP sent to your email. Valid for 15 minutes.' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending OTP', error: err.message });
  }
});

// POST /api/complaints/verify-email-otp - Public (verify OTP, marks email as verified for submit)
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalized = (email || '').toLowerCase().trim();
    if (!normalized || !otp || otp.length !== 6) {
      return res.status(400).json({ message: 'Email and 6-digit OTP are required' });
    }

    const record = await VerificationCode.findOne({ email: normalized, type: 'registration', verifiedAt: null });
    if (!record) {
      return res.status(400).json({ message: 'No OTP found for this email. Please request a new OTP.' });
    }
    if (new Date() > record.expiry) {
      await VerificationCode.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    const valid = await bcrypt.compare(otp.trim(), record.otpHash);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid OTP. Please check the code and try again.' });
    }

    await VerificationCode.deleteOne({ _id: record._id });
    await VerificationCode.create({ email: normalized, otpHash: 'verified', expiry: new Date(Date.now() + EMAIL_VERIFIED_EXPIRY_MS), type: 'registration', verifiedAt: new Date() });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP', error: err.message });
  }
});

// POST /api/complaints - Public (end user submits)
router.post('/', async (req, res) => {
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { userName, mobile, email, district, facilityType, facilityName, facilityCode, issueCategory, issueDescription, attachmentUrls } = req.body;
      const normalizedEmail = (email || '').toLowerCase().trim();

      const verifiedRecord = await VerificationCode.findOne({ email: normalizedEmail, type: 'registration', verifiedAt: { $ne: null } });
      if (!verifiedRecord) {
        return res.status(400).json({ message: 'Please verify your email with OTP before submitting the complaint.' });
      }
      if (Date.now() - new Date(verifiedRecord.verifiedAt).getTime() > EMAIL_VERIFIED_EXPIRY_MS) {
        await VerificationCode.deleteOne({ _id: verifiedRecord._id });
        return res.status(400).json({ message: 'Email verification expired. Please verify your email again.' });
      }
      await VerificationCode.deleteOne({ _id: verifiedRecord._id });

      const issueList = Array.isArray(issueCategory) ? issueCategory : [issueCategory];

      // Duplicate detection (24h window, same facilityCode)
      const dupWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const existingDup = await Complaint.findOne({ facilityCode, createdAt: { $gte: dupWindowStart } }).sort({ createdAt: -1 });
      if (existingDup) {
        const blockUntil = new Date(existingDup.createdAt.getTime() + DUPLICATE_WINDOW_MS);
        const hoursLeft = Math.ceil((blockUntil - Date.now()) / 3600000);
        return res.status(409).json({
          duplicate: true, ticketId: existingDup.ticketId, status: existingDup.status,
          facilityName: existingDup.facilityName, district: existingDup.district,
          message: `A complaint for this facility was already registered. Please wait approximately ${Math.max(hoursLeft, 1)} hour${Math.max(hoursLeft, 1) !== 1 ? 's' : ''} before submitting a new one.`
        });
      }

      const assignment = await assignmentService.autoAssignEngineer(facilityCode);
      const assignedEngineer = assignment.engineer?._id || null;
      const assignedAt = assignment.engineer ? new Date() : null;

      const complaint = await Complaint.create({
        userName, mobile, email, district, facilityType, facilityName, facilityCode,
        issueCategory: issueList, issueDescription,
        attachmentUrls: Array.isArray(attachmentUrls) ? attachmentUrls.slice(0, 2) : [],
        assignedTo: assignedEngineer, assignedAt, status: 'open',
        activityLog: [
          { action: 'Complaint Registered', performedBy: userName, performedByRole: 'user', notes: `Issue(s): ${issueList.join(', ')}` },
          { action: assignment.engineer ? 'Complaint Assigned' : 'Assignment Pending', performedBy: 'System', performedByRole: 'system',
            notes: assignment.engineer ? `Automatically assigned to ${assignment.engineer.name}\nDistrict : ${assignment.district}` : assignment.message }
        ]
      });

      const { summaryEmailSent, stakeholderEmailSent } = await notificationService.notifyAssigned(complaint, assignment.engineer);

      return res.status(201).json({
        message: 'Complaint registered successfully', ticketId: complaint.ticketId, complaintId: complaint._id,
        summaryEmailSent, stakeholderEmailSent
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.ticketId && attempt < MAX_RETRIES) {
        continue; // Retry with new random ticketId
      }
      console.error('Submit complaint error:', err);
      return res.status(400).json({ message: 'Error submitting complaint', error: err.message });
    }
  }
  res.status(500).json({ message: 'Failed to generate unique ticket ID after retries' });
});

// GET /api/complaints/track - Public (track complaints by email/mobile; no ticket id in URL)
router.get('/track', async (req, res) => {
  try {
    const { email, mobile } = req.query;
    let { limit = 20, page = 1 } = req.query;
    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    page = Math.max(Number(page) || 1, 1);
    const filter = {};

    if (email) {
      const normalized = String(email).toLowerCase().trim();
      if (!/\S+@\S+\.\S+/.test(normalized)) return res.status(400).json({ message: 'Invalid email' });
      filter.email = normalized;
    }
    if (mobile) {
      const normalizedMobile = String(mobile).trim();
      if (!/^[6-9]\d{9}$/.test(normalizedMobile)) return res.status(400).json({ message: 'Invalid mobile number' });
      filter.mobile = normalizedMobile;
    }

    if (!filter.email && !filter.mobile) {
      return res.status(400).json({ message: 'Provide either email or mobile to track complaints.' });
    }

    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .select('ticketId status district facilityType facilityName facilityCode issueCategory issueDescription attachmentUrls createdAt resolutionNotes resolvedAt closedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ complaints, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/complaints/track/:ticketId - Public (locked: must match email or mobile)
router.get('/track/:ticketId', async (req, res) => {
  try {
    const { email, mobile } = req.query;
    const { ticketId } = req.params;

    if (!email && !mobile) {
      return res.status(403).json({ message: 'Email or mobile is required to track a ticket.' });
    }

    const filter = { ticketId };
    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!/\S+@\S+\.\S+/.test(normalizedEmail)) return res.status(400).json({ message: 'Invalid email' });
      filter.email = normalizedEmail;
    }
    if (mobile) {
      const normalizedMobile = String(mobile).trim();
      if (!/^[6-9]\d{9}$/.test(normalizedMobile)) return res.status(400).json({ message: 'Invalid mobile number' });
      filter.mobile = normalizedMobile;
    }

    const complaint = await Complaint.findOne(filter)
      .select('ticketId status district facilityType facilityName facilityCode issueCategory issueDescription attachmentUrls createdAt resolutionNotes resolvedAt closedAt');

    if (!complaint) return res.status(404).json({ message: 'Ticket not found' });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/complaints - Admin: all, Engineer: only assigned complaints
router.get('/', protect, async (req, res) => {
  try {
    const { status, district, facilityType, priority, engineer, startDate, endDate, issueCategory, search, sort } = req.query;
    let { page = 1, limit = 20 } = req.query;
    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    page = Math.max(Number(page) || 1, 1);

    const filter = {};

    // Engineer can only see complaints assigned to them within their districts
    if (req.user.role === "engineer") {
      filter.assignedTo = req.user._id;
      if (req.user.assignedDistricts && req.user.assignedDistricts.length > 0) {
        filter.district = { $in: req.user.assignedDistricts };
      }
    }

    // Optional filters
    if (status) filter.status = status;
    if (district) filter.district = district;
    if (facilityType) filter.facilityType = facilityType;
    if (priority) filter.priority = priority;
    if (engineer) filter.assignedTo = engineer;
    if (issueCategory) filter.issueCategory = { $in: issueCategory.split(',') };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { district: { $regex: escaped, $options: 'i' } },
        { facilityName: { $regex: escaped, $options: 'i' } },
        { userName: { $regex: escaped, $options: 'i' } }
      ];
    }

    const total = await Complaint.countDocuments(filter);

    let sortObj = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'priority') sortObj = { priority: -1, createdAt: -1 };

    const complaints = await Complaint.find(filter)
      .populate("assignedTo", "name email")
      .sort(sortObj)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      complaints,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

// GET /api/complaints/engineer-stats - Engineer dashboard stats
router.get('/engineer-stats', protect, requireRole('engineer'), async (req, res) => {
  try {
    const match = { assignedTo: req.user._id };
    if (req.user.assignedDistricts && req.user.assignedDistricts.length > 0) {
      match.district = { $in: req.user.assignedDistricts };
    }

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    const [statusStats, resolvedWeek, resolvedMonth, resolvedToday, avgTime] = await Promise.all([
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.countDocuments({ ...match, status: 'resolved', resolvedAt: { $gte: weekStart } }),
      Complaint.countDocuments({ ...match, status: 'resolved', resolvedAt: { $gte: monthStart } }),
      Complaint.countDocuments({ ...match, status: 'resolved', resolvedAt: { $gte: todayStart } }),
      Complaint.aggregate([
        { $match: { ...match, status: 'resolved', resolvedAt: { $ne: null } } },
        { $project: { diff: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$diff' } } }
      ])
    ]);

    const total = await Complaint.countDocuments(match);

    const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    statusStats.forEach(s => { stats[s._id] = s.count; });

    res.json({
      total,
      ...stats,
      resolvedWeek, resolvedMonth, resolvedToday,
      avgResolutionHours: avgTime.length > 0 ? Math.round(avgTime[0].avgMs / 3600000) : 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/complaints/stats - Admin dashboard stats
router.get('/stats', protect, requireRole('admin'), async (req, res) => {
  try {
    const [
      statusStats,
      districtStats,
      categoryStats,
      monthlyStats,
      engineerCount,
      activeEngineerCount,
      resolvedTodayCount
    ] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$district', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Complaint.aggregate([{ $group: { _id: '$issueCategory', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Complaint.aggregate([
        { $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      User.countDocuments({ role: 'engineer' }),
      User.countDocuments({ role: 'engineer', isActive: true }),
      Complaint.countDocuments({
        status: 'resolved',
        resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);
    const total = await Complaint.countDocuments();
    res.json({
      total,
      statusStats,
      districtStats,
      categoryStats,
      monthlyStats,
      engineerCount,
      activeEngineerCount,
      resolvedTodayCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/complaints/:id - Single complaint detail
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('assignedTo', 'name email role');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Engineer can only view complaints assigned to them
    if (req.user.role === 'engineer' && (!complaint.assignedTo || String(complaint.assignedTo._id) !== String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied. This complaint is not assigned to you.' });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/complaints/:id/assign - Admin assigns to engineer
router.patch('/:id/assign', protect, requireRole('admin'), async (req, res) => {
  try {
    const { engineerId } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: engineerId,
        assignedAt: new Date(),
        status: 'open',
        $push: { activityLog: { action: 'Assigned to Engineer', performedBy: req.user.name, performedByRole: 'admin', timestamp: new Date() } }
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    // FEATURE 3: notify on manual assignment too
    if (complaint?.assignedTo) {
      notificationService.notifyAssigned(complaint, complaint.assignedTo).catch(err =>
        console.error('Manual assignment notification failed:', err)
      );
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ==========================================================
// FEATURE 1: PATCH /api/complaints/:id/accept - Engineer accepts an assigned open ticket
// (No email is sent on acceptance, by design)
// ==========================================================
router.patch('/:id/accept', protect, requireRole('engineer'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('assignedTo', 'name email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Only the assigned engineer can accept this ticket
    if (!complaint.assignedTo || String(complaint.assignedTo._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. This ticket is not assigned to you.' });
    }

    // Cannot accept a ticket that isn't in "open" state (already accepted / resolved / closed)
    if (complaint.status !== 'open') {
      return res.status(400).json({ message: `Ticket cannot be accepted from status "${complaint.status}".` });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        status: 'in_progress',
        acceptedAt: new Date(),
        $push: {
          activityLog: {
            action: 'Ticket Accepted',
            performedBy: req.user.name,
            performedByRole: 'engineer',
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/complaints/:id/status - Engineer/Admin updates status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status, notes, priority, otp } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Engineer can only update complaints assigned to them
    if (req.user.role === 'engineer' && (!complaint.assignedTo || String(complaint.assignedTo) !== String(req.user._id))) {
      return res.status(403).json({ message: 'Access denied. This complaint is not assigned to you.' });
    }

    // Resolved status requires OTP verification
    if (status === 'resolved') {
      if (!otp) {
        // Step 1: Request resolve - generate OTP, send email
        const otpCode = generateOTP();
        const otpHash = await bcrypt.hash(otpCode, 10);
        const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await Complaint.findByIdAndUpdate(req.params.id, {
          pendingResolveOTP: otpHash,
          pendingResolveOTPExpiry: expiry
        });

        try {
          await sendOTPEmail(complaint.email, otpCode, complaint.ticketId, complaint.userName);
        } catch (emailErr) {
          console.error('OTP email failed:', emailErr);
          await Complaint.findByIdAndUpdate(req.params.id, { $unset: { pendingResolveOTP: 1, pendingResolveOTPExpiry: 1 } });
          return res.status(500).json({
            message: 'Failed to send OTP email. Check SMTP config.',
            error: emailErr.message
          });
        }

        return res.json({
          requiresOtp: true,
          message: `OTP sent to complainant's email (${complaint.email}). Ask them for the 6-digit code and enter it to confirm resolution.`
        });
      }

      // Step 2: Verify OTP and mark resolved
      if (!complaint.pendingResolveOTP || !complaint.pendingResolveOTPExpiry) {
        return res.status(400).json({ message: 'OTP not requested. Please request OTP first by clicking Update without entering OTP.' });
      }
      if (new Date() > complaint.pendingResolveOTPExpiry) {
        await Complaint.findByIdAndUpdate(req.params.id, { $unset: { pendingResolveOTP: 1, pendingResolveOTPExpiry: 1 } });
        return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
      }
      const valid = await bcrypt.compare(otp.trim(), complaint.pendingResolveOTP);
      if (!valid) {
        return res.status(400).json({ message: 'Invalid OTP. Please check the code from the complainant.' });
      }

      const logEntry = { action: 'Status changed to resolved', performedBy: req.user.name, performedByRole: req.user.role, timestamp: new Date(), notes };
      const updated = await Complaint.findByIdAndUpdate(
        req.params.id,
        {
          status: 'resolved',
          resolvedAt: new Date(),
          resolutionNotes: notes || complaint.resolutionNotes,
          priority: priority || complaint.priority,
          $unset: { pendingResolveOTP: 1, pendingResolveOTPExpiry: 1 },
          $push: { activityLog: logEntry }
        },
        { new: true }
      ).populate('assignedTo', 'name email');

      // FEATURE 3: notify on resolution
      notificationService.notifyResolved(updated).catch(err =>
        console.error('Ticket resolved notification failed:', err)
      );

      return res.json(updated);
    }

    // Other statuses: direct update
    const updates = { status };
    const logEntry = { action: `Status changed to ${status}`, performedBy: req.user.name, performedByRole: req.user.role, timestamp: new Date(), notes };

    if (status === 'closed') updates.closedAt = new Date();
    if (notes) updates.resolutionNotes = notes;
    if (priority) updates.priority = priority;
    updates.$push = { activityLog: logEntry };

    const result = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assignedTo', 'name email');

    // FEATURE 3: notify on closure
    if (status === 'closed') {
      notificationService.notifyClosed(result).catch(err =>
        console.error('Ticket closed notification failed:', err)
      );
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;