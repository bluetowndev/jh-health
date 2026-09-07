const express = require('express');
const bcrypt = require('bcryptjs');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/email');
const notificationService = require('../services/notificationService');

const router = express.Router();

const OTP_EXPIRY_MINUTES = 15;

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Helper: get team lead's assigned districts
async function getTlDistricts(tlUserId) {
  const tlUser = await User.findById(tlUserId).select('assignedDistricts');
  return tlUser?.assignedDistricts || [];
}

// Helper: find engineers for this TL — first by teamLeadId, then fallback to district overlap
async function getTeamEngineers(tlUserId, tlDistricts) {
  // 1. Try explicit teamLeadId link
  let engineers = await User.find({ teamLeadId: tlUserId, role: 'engineer', isActive: true })
    .select('_id name email assignedDistricts');

  // 2. If none linked, find engineers whose districts overlap with TL's districts
  if (engineers.length === 0 && tlDistricts.length > 0) {
    engineers = await User.find({
      role: 'engineer',
      isActive: true,
      assignedDistricts: { $in: tlDistricts }
    }).select('_id name email assignedDistricts');
  }

  return engineers;
}

// Helper: get IDs of engineers under this team lead
async function getTeamEngineerIds(tlUserId, tlDistricts) {
  const engineers = await getTeamEngineers(tlUserId, tlDistricts);
  return engineers.map(e => e._id);
}

// GET /api/teamlead/stats - KPI stats scoped to TL's team, with district grouping
router.get('/stats', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const tlDistricts = await getTlDistricts(req.user._id);
    const teamEngineers = await getTeamEngineers(req.user._id, tlDistricts);
    const engineerIds = teamEngineers.map(e => e._id);
    const match = engineerIds.length > 0 ? { assignedTo: { $in: engineerIds } } : { _id: null }; // no match if no engineers

    console.log(`[TL Stats] TL: ${req.user.name}, Districts: [${tlDistricts}], Engineers found: ${teamEngineers.length}, Engineer IDs: [${engineerIds}], Match:`, JSON.stringify(match));

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const [statusStats, totalCount, resolvedTodayCount, createdTodayCount, closedTodayCount, avgResolutionTime, oldestPending, engineerPerformance, resolvedCount, closedCount] = await Promise.all([
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.countDocuments(match),
      Complaint.countDocuments({ ...match, status: { $in: ['resolved', 'closed'] }, createdAt: { $gte: todayStart } }),
      Complaint.countDocuments({ ...match, createdAt: { $gte: todayStart } }),
      Complaint.countDocuments({ ...match, closedAt: { $gte: todayStart } }),
      Complaint.aggregate([
        { $match: { ...match, status: { $in: ['resolved', 'closed'] }, $or: [{ resolvedAt: { $ne: null } }, { closedAt: { $ne: null } }] } },
        { $project: { diff: { $subtract: [{ $ifNull: ['$resolvedAt', '$closedAt'] }, '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$diff' } } }
      ]),
      Complaint.findOne({ ...match, status: { $in: ['open', 'in_progress'] } }).sort({ createdAt: 1 }).select('ticketId createdAt district facilityName'),
      User.aggregate([
        { $match: { _id: { $in: engineerIds } } },
        {
          $lookup: {
            from: 'complaints',
            localField: '_id',
            foreignField: 'assignedTo',
            as: 'complaints'
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            assignedDistricts: 1,
            totalAssigned: { $size: '$complaints' },
            resolvedCount: {
              $size: {
                $filter: { input: '$complaints', cond: { $in: ['$$this.status', ['resolved', 'closed']] } }
              }
            },
            openCount: {
              $size: {
                $filter: { input: '$complaints', cond: { $eq: ['$$this.status', 'open'] } }
              }
            },
            inProgressCount: {
              $size: {
                $filter: { input: '$complaints', cond: { $eq: ['$$this.status', 'in_progress'] } }
              }
            },
            closedCount: {
              $size: {
                $filter: { input: '$complaints', cond: { $eq: ['$$this.status', 'closed'] } }
              }
            }
          }
        },
        { $sort: { resolvedCount: -1 } }
      ]),
      // Count complaints that are resolved or closed (both mean issue is fixed)
      Complaint.countDocuments({ ...match, status: { $in: ['resolved', 'closed'] } }),
      // Count complaints currently closed
      Complaint.countDocuments({ ...match, status: 'closed' })
    ]);

    const statusMap = {};
    statusStats.forEach(s => { statusMap[s._id] = s.count; });

    const avgMs = avgResolutionTime[0]?.avgMs || null;
    const avgDays = avgMs ? Math.round(avgMs / 86400000 * 10) / 10 : null;
    const totalResolved = resolvedCount || 0;
    const totalClosed = closedCount || 0;
    const resolutionPct = totalCount > 0 ? Math.round(totalResolved / totalCount * 100) : 0;

    console.log(`[TL Stats] Total: ${totalCount}, Resolved: ${totalResolved}, Closed: ${totalClosed}, StatusMap:`, statusMap);

    const enrichedPerf = engineerPerformance.map(e => ({
      ...e,
      resolutionPct: e.totalAssigned > 0 ? Math.round(e.resolvedCount / e.totalAssigned * 100) : 0
    }));

    // Build district summary: group engineers by their primary district
    const districtMap = {};
    // Initialize all TL districts
    tlDistricts.forEach(d => {
      districtMap[d] = { district: d, engineers: [], totalComplaints: 0, resolvedComplaints: 0, pendingComplaints: 0 };
    });

    // Assign engineers to districts (an engineer may appear in multiple districts)
    enrichedPerf.forEach(eng => {
      const engDistricts = eng.assignedDistricts?.length ? eng.assignedDistricts : tlDistricts;
      engDistricts.forEach(d => {
        if (!districtMap[d]) {
          districtMap[d] = { district: d, engineers: [], totalComplaints: 0, resolvedComplaints: 0, pendingComplaints: 0 };
        }
        districtMap[d].engineers.push(eng);
        districtMap[d].totalComplaints += eng.totalAssigned || 0;
        districtMap[d].resolvedComplaints += eng.resolvedCount || 0;
        districtMap[d].pendingComplaints += (eng.openCount || 0) + (eng.inProgressCount || 0);
      });
    });

    // If no TL districts configured, auto-detect from engineer assignments
    if (tlDistricts.length === 0) {
      const allDistricts = new Set();
      teamEngineers.forEach(e => {
        (e.assignedDistricts || []).forEach(d => allDistricts.add(d));
      });
      allDistricts.forEach(d => {
        if (!districtMap[d]) {
          districtMap[d] = { district: d, engineers: [], totalComplaints: 0, resolvedComplaints: 0, pendingComplaints: 0 };
        }
      });
      // Re-run grouping with auto-detected districts
      enrichedPerf.forEach(eng => {
        const engDistricts = eng.assignedDistricts?.length ? eng.assignedDistricts : [...allDistricts];
        engDistricts.forEach(d => {
          if (districtMap[d] && !districtMap[d].engineers.some(e => e.email === eng.email)) {
            districtMap[d].engineers.push(eng);
            districtMap[d].totalComplaints += eng.totalAssigned || 0;
            districtMap[d].resolvedComplaints += eng.resolvedCount || 0;
            districtMap[d].pendingComplaints += (eng.openCount || 0) + (eng.inProgressCount || 0);
          }
        });
      });
    }

    const districtSummary = Object.values(districtMap)
      .filter(d => d.engineers.length > 0 || tlDistricts.includes(d.district))
      .sort((a, b) => b.totalComplaints - a.totalComplaints);

    res.json({
      total: totalCount,
      open: statusMap.open || 0,
      inProgress: statusMap.in_progress || 0,
      resolved: totalResolved,
      closed: totalClosed,
      resolvedToday: resolvedTodayCount,
      createdToday: createdTodayCount,
      closedToday: closedTodayCount,
      avgResolutionDays: avgDays,
      resolutionPct,
      oldestPending,
      engineerPerformance: enrichedPerf,
      teamSize: engineerIds.length,
      tlDistricts,
      districtSummary
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/teamlead/complaints - Paginated complaints from TL's team
router.get('/complaints', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const tlDistricts = await getTlDistricts(req.user._id);
    const engineerIds = await getTeamEngineerIds(req.user._id, tlDistricts);
    let { page = 1, limit = 20, status, district, priority, engineer, issueCategory, startDate, endDate, search, sort } = req.query;
    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    page = Math.max(Number(page) || 1, 1);

    const match = { assignedTo: { $in: engineerIds } };
    if (status) match.status = status;
    if (district) {
      // Only allow filtering by TL's own districts
      if (tlDistricts.length > 0 && !tlDistricts.includes(district)) {
        return res.status(403).json({ message: 'Cannot filter by district outside your scope.' });
      }
      match.district = district;
    }
    if (priority) match.priority = priority;
    if (engineer) match.assignedTo = engineer;
    if (issueCategory) match.issueCategory = { $in: issueCategory.split(',') };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { facilityName: { $regex: escaped, $options: 'i' } },
        { userName: { $regex: escaped, $options: 'i' } },
        { district: { $regex: escaped, $options: 'i' } }
      ];
    }

    let sortObj = { createdAt: -1 };
    if (sort) {
      const parts = sort.split(':');
      sortObj = { [parts[0]]: parts[1] === 'asc' ? 1 : -1 };
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(match).populate('assignedTo', 'name email').sort(sortObj).skip((page - 1) * limit).limit(limit),
      Complaint.countDocuments(match)
    ]);

    res.json({ complaints, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/teamlead/complaints/:id/assign - Reassign within team
router.patch('/complaints/:id/assign', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const { engineerId } = req.body;
    const tlDistricts = await getTlDistricts(req.user._id);
    const engineerIds = await getTeamEngineerIds(req.user._id, tlDistricts);

    if (!engineerIds.some(id => String(id) === String(engineerId))) {
      return res.status(403).json({ message: 'Cannot assign to engineer outside your team.' });
    }

    // Verify complaint belongs to this TL's team
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (!complaint.assignedTo || !engineerIds.some(id => String(id) === String(complaint.assignedTo))) {
      return res.status(403).json({ message: 'This complaint is not assigned to your team.' });
    }

    const updated = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: engineerId,
        assignedAt: new Date(),
        status: 'open',
        $push: { activityLog: { action: 'Reassigned by Team Lead', performedBy: req.user.name, performedByRole: 'teamLead', timestamp: new Date() } }
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (complaint?.assignedTo) {
      notificationService.notifyAssigned(complaint, complaint.assignedTo).catch(err =>
        console.error('TL reassignment notification failed:', err)
      );
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/teamlead/complaints/:id/status - Update status (with OTP for resolved)
router.patch('/complaints/:id/status', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const { status, notes, priority, otp } = req.body;
    const tlDistricts = await getTlDistricts(req.user._id);
    const engineerIds = await getTeamEngineerIds(req.user._id, tlDistricts);
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (!complaint.assignedTo || !engineerIds.some(id => String(id) === String(complaint.assignedTo))) {
      return res.status(403).json({ message: 'This complaint is not assigned to your team.' });
    }

    if (status === 'resolved') {
      if (!otp) {
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
          return res.status(500).json({ message: 'Failed to send OTP email.', error: emailErr.message });
        }

        return res.json({
          requiresOtp: true,
          message: `OTP sent to complainant's email (${complaint.email}). Enter the 6-digit code to confirm resolution.`
        });
      }

      if (!complaint.pendingResolveOTP || !complaint.pendingResolveOTPExpiry) {
        return res.status(400).json({ message: 'OTP not requested. Please request OTP first.' });
      }
      if (new Date() > complaint.pendingResolveOTPExpiry) {
        await Complaint.findByIdAndUpdate(req.params.id, { $unset: { pendingResolveOTP: 1, pendingResolveOTPExpiry: 1 } });
        return res.status(400).json({ message: 'OTP expired. Please request a new OTP.' });
      }
      const valid = await bcrypt.compare(otp.trim(), complaint.pendingResolveOTP);
      if (!valid) {
        return res.status(400).json({ message: 'Invalid OTP.' });
      }

      const logEntry = { action: 'Status changed to resolved', performedBy: req.user.name, performedByRole: 'teamLead', timestamp: new Date(), notes };
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

      notificationService.notifyResolved(updated).catch(err =>
        console.error('Ticket resolved notification failed:', err)
      );

      return res.json(updated);
    }

    // Other statuses
    const updates = { status };
    const logEntry = { action: `Status changed to ${status}`, performedBy: req.user.name, performedByRole: 'teamLead', timestamp: new Date(), notes };

    if (status === 'closed') updates.closedAt = new Date();
    if (notes) updates.resolutionNotes = notes;
    if (priority) updates.priority = priority;
    updates.$push = { activityLog: logEntry };

    const result = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assignedTo', 'name email');

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

// GET /api/teamlead/debug - Debug: show TL's data and potential engineers
router.get('/debug', protect, requireRole('teamLead'), async (req, res) => {
  try {
    const tlUser = await User.findById(req.user._id).select('name email assignedDistricts');
    const linkedEngineers = await User.find({ teamLeadId: req.user._id, role: 'engineer', isActive: true })
      .select('name email assignedDistricts teamLeadId');
    const districtMatchEngineers = tlUser.assignedDistricts?.length > 0
      ? await User.find({ role: 'engineer', isActive: true, assignedDistricts: { $in: tlUser.assignedDistricts } })
          .select('name email assignedDistricts teamLeadId')
      : [];
    const allEngineers = await User.find({ role: 'engineer', isActive: true })
      .select('name email assignedDistricts teamLeadId');

    res.json({
      tl: tlUser,
      linkedByTeamLeadId: linkedEngineers,
      matchedByDistrict: districtMatchEngineers,
      allActiveEngineers: allEngineers,
      counts: {
        linked: linkedEngineers.length,
        districtMatch: districtMatchEngineers.length,
        total: allEngineers.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
