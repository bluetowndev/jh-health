const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', protect, requireRole('management', 'admin'), async (req, res) => {
  try {
    const {
      district,
      facility,
      engineer,
      status,
      priority,
      issueCategory,
      startDate,
      endDate
    } = req.query;

    const match = {};
    if (district) match.district = district;
    if (facility) match.facilityName = facility;
    if (engineer) match.assignedTo = engineer;
    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (issueCategory) match.issueCategory = { $in: issueCategory.split(',') };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const [
      statusStats,
      districtStats,
      categoryStats,
      monthlyStats,
      engineerCount,
      activeEngineerCount,
      resolvedTodayCount,
      createdTodayCount,
      avgResolutionTime,
      oldestPending,
      engineerPerformance,
      totalCount,
      facilityStats
    ] = await Promise.all([
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      Complaint.aggregate([
        { $match: match },
        { $unwind: '$issueCategory' },
        { $group: { _id: '$issueCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $match: match },
        { $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            registered: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      User.countDocuments({ role: 'engineer' }),
      User.countDocuments({ role: 'engineer', isActive: true }),
      Complaint.countDocuments({
        ...match,
        status: 'resolved',
        resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Complaint.countDocuments({
        ...match,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      Complaint.aggregate([
        { $match: { ...match, status: 'resolved', resolvedAt: { $ne: null } } },
        { $project: {
            resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
        }},
        { $group: { _id: null, avgMs: { $avg: '$resolutionTime' } } }
      ]),
      Complaint.findOne({
        ...match,
        status: { $in: ['open', 'in_progress'] }
      }).sort({ createdAt: 1 }).select('ticketId createdAt district facilityName'),
      User.aggregate([
        { $match: { role: 'engineer', isActive: true } },
        { $lookup: {
            from: 'complaints',
            let: { engineerId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$assignedTo', '$$engineerId'] } } },
              { $project: {
                  status: 1,
                  resolutionTime: {
                    $cond: {
                      if: { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
                      then: { $subtract: ['$resolvedAt', '$createdAt'] },
                      else: null
                    }
                  }
              }}
            ],
            as: 'complaints'
        }},
        { $project: {
            name: 1,
            email: 1,
            totalAssigned: { $size: '$complaints' },
            resolvedCount: {
              $size: { $filter: { input: '$complaints', as: 'c', cond: { $eq: ['$$c.status', 'resolved'] } } }
            },
            pendingCount: {
              $size: { $filter: { input: '$complaints', as: 'c', cond: { $in: ['$$c.status', ['open', 'in_progress']] } } }
            },
            closedCount: {
              $size: { $filter: { input: '$complaints', as: 'c', cond: { $eq: ['$$c.status', 'closed'] } } }
            },
            avgResolutionMs: { $avg: '$complaints.resolutionTime' }
        }},
        { $sort: { resolvedCount: -1 } }
      ]),
      Complaint.countDocuments(match),
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: { district: '$district', facilityName: '$facilityName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ])
    ]);

    const resolved = statusStats.find(s => s._id === 'resolved');
    const closed = statusStats.find(s => s._id === 'closed');
    const open = statusStats.find(s => s._id === 'open');
    const inProgress = statusStats.find(s => s._id === 'in_progress');
    const resolvedClosedCount = (resolved?.count || 0) + (closed?.count || 0);
    const resolutionPct = totalCount > 0 ? Math.round((resolvedClosedCount / totalCount) * 100) : 0;
    const avgDays = avgResolutionTime.length > 0
      ? Math.round(avgResolutionTime[0].avgMs / (1000 * 60 * 60 * 24) * 10) / 10
      : null;
    const assignedCount = await Complaint.countDocuments({
      ...match,
      assignedTo: { $ne: null }
    });

    const pendingCount = (open?.count || 0) + (inProgress?.count || 0);

    const engineerPerf = engineerPerformance.map(ep => ({
      name: ep.name,
      email: ep.email,
      totalAssigned: ep.totalAssigned,
      resolvedCount: ep.resolvedCount,
      pendingCount: ep.pendingCount,
      closedCount: ep.closedCount,
      avgResolutionDays: ep.avgResolutionMs
        ? Math.round(ep.avgResolutionMs / (1000 * 60 * 60 * 24) * 10) / 10
        : null,
      resolutionPct: ep.totalAssigned > 0
        ? Math.round((ep.resolvedCount / ep.totalAssigned) * 100)
        : 0
    }));

    const districtsCovered = await Complaint.distinct('district', match);

    const recentComplaints = await Complaint.find(match)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const resolvedMonthly = monthlyStats.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
      registered: m.registered,
      resolved: m.resolved,
      closed: m.closed,
      pending: m.registered - m.resolved - m.closed
    }));

    const districtAnalysis = await Promise.all(districtStats.map(async ds => {
      const resolved = await Complaint.countDocuments({
        ...match,
        district: ds._id,
        status: { $in: ['resolved', 'closed'] }
      });
      return {
        district: ds._id,
        total: ds.count,
        resolved,
        pending: ds.count - resolved
      };
    }));

    res.json({
      total: totalCount,
      statusStats,
      districtStats: districtAnalysis,
      categoryStats,
      monthlyStats: resolvedMonthly,
      engineerCount,
      activeEngineerCount,
      resolvedTodayCount,
      createdTodayCount,
      avgResolutionDays: avgDays,
      resolutionPct,
      assignedCount,
      pendingCount,
      oldestPending: oldestPending
        ? { ticketId: oldestPending.ticketId, createdAt: oldestPending.createdAt, district: oldestPending.district, facilityName: oldestPending.facilityName }
        : null,
      engineerPerformance: engineerPerf,
      districtsCovered: districtsCovered.length,
      recentComplaints,
      facilityStats
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/complaints', protect, requireRole('management', 'admin'), async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    page = Math.max(Number(page) || 1, 1);
    const { district, status, priority, engineer, facility, issueCategory, startDate, endDate, search } = req.query;
    const skip = (page - 1) * limit;

    const match = {};
    if (district) match.district = district;
    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (engineer) match.assignedTo = engineer;
    if (facility) match.facilityName = facility;
    if (issueCategory) match.issueCategory = { $in: issueCategory.split(',') };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { ticketId: { $regex: escaped, $options: 'i' } },
        { district: { $regex: escaped, $options: 'i' } },
        { facilityName: { $regex: escaped, $options: 'i' } },
        { userName: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(match)
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(match)
    ]);

    res.json({ complaints, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
