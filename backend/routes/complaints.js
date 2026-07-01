const express = require('express');
const bcrypt = require('bcryptjs');
const Complaint = require('../models/Complaint');
const NotificationDirectory = require('../models/NotificationDirectory');
const assignmentService = require('../services/assignmentService');
const Facility = require('../models/Facility');
const { protect, requireRole } = require('../middleware/auth');
const { sendOTPEmail, sendRegistrationOTPEmail, sendComplaintSummaryEmail, sendComplaintAlertEmail } = require('../utils/email');

const router = express.Router();

const OTP_EXPIRY_MINUTES = 15;
const EMAIL_VERIFIED_EXPIRY_MS = 30 * 60 * 1000; // 30 min

// In-memory store: email -> { otpHash, expiry } for registration OTP
const registrationOTPStore = new Map();
// In-memory store: email -> { verifiedAt } for verified emails (one-time use on submit)
const verifiedEmailStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function cleanupExpiredOTP() {
  const now = new Date();
  for (const [email, data] of registrationOTPStore.entries()) {
    if (now > data.expiry) registrationOTPStore.delete(email);
  }
  for (const [email, data] of verifiedEmailStore.entries()) {
    if (Date.now() - data.verifiedAt > EMAIL_VERIFIED_EXPIRY_MS) verifiedEmailStore.delete(email);
  }
}

// POST /api/complaints/send-email-otp - Public (send OTP to verify email)
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const normalized = (email || '').toLowerCase().trim();
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      return res.status(400).json({ message: 'Valid email address is required' });
    }

    cleanupExpiredOTP();
    const otpCode = generateOTP();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    registrationOTPStore.set(normalized, { otpHash, expiry });

    try {
      await sendRegistrationOTPEmail(normalized, otpCode);
    } catch (emailErr) {
      console.error('Registration OTP email failed:', emailErr);
      registrationOTPStore.delete(normalized);
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

    const data = registrationOTPStore.get(normalized);
    if (!data) {
      return res.status(400).json({ message: 'No OTP found for this email. Please request a new OTP.' });
    }
    if (new Date() > data.expiry) {
      registrationOTPStore.delete(normalized);
      return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
    }
    const valid = await bcrypt.compare(otp.trim(), data.otpHash);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid OTP. Please check the code and try again.' });
    }

    registrationOTPStore.delete(normalized);
    verifiedEmailStore.set(normalized, { verifiedAt: Date.now() });
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying OTP', error: err.message });
  }
});

// POST /api/complaints - Public (end user submits)
router.post('/', async (req, res) => {
  try {
    const { userName, mobile, email, district, facilityType, facilityName, facilityCode, issueCategory, issueDescription, attachmentUrls } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Require email verification before accepting complaint
    const verified = verifiedEmailStore.get(normalizedEmail);
    if (!verified) {
      return res.status(400).json({ message: 'Please verify your email with OTP before submitting the complaint.' });
    }
    if (Date.now() - verified.verifiedAt > EMAIL_VERIFIED_EXPIRY_MS) {
      verifiedEmailStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'Email verification expired. Please verify your email again.' });
    }
    verifiedEmailStore.delete(normalizedEmail); // One-time use

    const issueList = Array.isArray(issueCategory)
      ? issueCategory
      : [issueCategory];

    // ==========================
    // AUTO ASSIGN ENGINEER
    // ==========================

    const assignment = await assignmentService.autoAssignEngineer(facilityCode);

    let assignedEngineer = null;
    let assignedAt = null;
    // IMPORTANT: status ALWAYS starts as "open", even when auto-assigned.
    // It only moves to "in_progress" when the engineer starts work.
    const complaintStatus = "open";

    if (assignment.engineer) {
      assignedEngineer = assignment.engineer._id;
      assignedAt = new Date();
    }

    // ==========================
    // CREATE COMPLAINT
    // ==========================

    const complaint = await Complaint.create({

      userName,
      mobile,
      email,

      district,

      facilityType,

      facilityName,

      facilityCode,

      issueCategory: issueList,

      issueDescription,

      attachmentUrls: Array.isArray(attachmentUrls)
        ? attachmentUrls.slice(0, 2)
        : [],

      assignedTo: assignedEngineer,

      assignedAt,

      status: complaintStatus,

      activityLog: [

        {
          action: "Complaint Registered",
          performedBy: userName,
          performedByRole: "user",
          notes: `Issue(s): ${issueList.join(", ")}`
        },

        {
          action: assignment.engineer
            ? "Complaint Assigned"
            : "Assignment Pending",

          performedBy: "System",

          performedByRole: "system",

          notes: assignment.engineer
            ? `Automatically assigned to ${assignment.engineer.name}\nDistrict : ${assignment.district}`
            : assignment.message
        }

      ]

    });

    // Send complaint summary email (best effort; do not block registration on mail errors)
    let summaryEmailSent = true;
    try {
      await sendComplaintSummaryEmail(normalizedEmail, complaint);
    } catch (emailErr) {
      summaryEmailSent = false;
      console.error('Complaint summary email failed:', emailErr);
    }

    // Notify auto-assigned engineer (if any) + team lead / state head / ops manager
    // from NotificationDirectory (best effort)
    let stakeholderEmailSent = true;
    try {
      const directory = await NotificationDirectory.findOne({ key: 'default' });
      const mapping = directory?.mappings?.find(m => m.facilityCode === complaint.facilityCode);
      const recipientSet = new Set();
      const addRecipient = (email) => {
        const normalized = String(email || '').toLowerCase().trim();
        if (!normalized) return;
        if (!/\S+@\S+\.\S+/.test(normalized)) return;
        if (normalized === normalizedEmail) return; // user already gets summary email
        recipientSet.add(normalized);
      };

      // Notify the actually auto-assigned engineer (replaces old facilityCode -> engineer mapping)
      if (assignment.engineer) {
        addRecipient(assignment.engineer.email);
      } else {
        // No engineer auto-assigned; fall back to old mapping so someone still gets notified
        addRecipient(mapping?.engineer?.email);
      }

      addRecipient(mapping?.teamLead?.email);
      addRecipient(directory?.stateHead?.email);
      addRecipient(directory?.opsManager?.email);
      const recipients = [...recipientSet];
      if (recipients.length) await sendComplaintAlertEmail(recipients, complaint);
    } catch (emailErr) {
      stakeholderEmailSent = false;
      console.error('Stakeholder alert email failed:', emailErr);
    }

    res.status(201).json({
      message: 'Complaint registered successfully',
      ticketId: complaint.ticketId,
      complaintId: complaint._id,
      summaryEmailSent,
      stakeholderEmailSent
    });
  } catch (err) {
    res.status(400).json({ message: 'Error submitting complaint', error: err.message });
  }
});

// GET /api/complaints/track - Public (track complaints by email/mobile; no ticket id in URL)
router.get('/track', async (req, res) => {
  try {
    const { email, mobile, limit = 20, page = 1 } = req.query;
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
    const { status, district, facilityType, page = 1, limit = 20 } = req.query;

    const filter = {};

    // Engineer can only see complaints assigned to them
    if (req.user.role === "engineer") {
      filter.assignedTo = req.user._id;
    }

    // Optional filters
    if (status) filter.status = status;
    if (district) filter.district = district;
    if (facilityType) filter.facilityType = facilityType;

    const total = await Complaint.countDocuments(filter);

    const complaints = await Complaint.find(filter)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
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

// GET /api/complaints/stats - Admin dashboard stats
router.get('/stats', protect, requireRole('admin'), async (req, res) => {
  try {
    const [statusStats, districtStats, categoryStats] = await Promise.all([
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $group: { _id: '$district', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Complaint.aggregate([{ $group: { _id: '$issueCategory', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    ]);
    const total = await Complaint.countDocuments();
    res.json({ total, statusStats, districtStats, categoryStats });
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
    res.json(complaint);
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;