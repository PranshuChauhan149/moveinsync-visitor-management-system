const Visitor = require('../models/Visitor');
const Approval = require('../models/Approval');
const Visit = require('../models/Visit');

// GET /api/reports/dashboard
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const visitorFilter = req.user.role === 'HOST' ? { hostId: req.user._id } : {};

    const [
      todayVisitors,
      yesterdayVisitors,
      pendingApprovals,
      currentlyInside,
      preApproved,
    ] = await Promise.all([
      Visitor.countDocuments({ ...visitorFilter, visitDate: { $gte: today, $lt: tomorrow } }),
      Visitor.countDocuments({ ...visitorFilter, visitDate: { $gte: yesterday, $lt: today } }),
      Approval.countDocuments({
        ...(req.user.role === 'HOST' ? { hostId: req.user._id } : {}),
        status: 'PENDING',
      }),
      Visitor.countDocuments({ ...visitorFilter, status: 'CHECKED_IN' }),
      Visitor.countDocuments({
        ...visitorFilter,
        isPreApproved: true,
        visitDate: { $gte: today },
        status: 'PRE_APPROVED',
      }),
    ]);

    const trend = yesterdayVisitors > 0
      ? (((todayVisitors - yesterdayVisitors) / yesterdayVisitors) * 100).toFixed(1)
      : null;

    res.status(200).json({
      success: true,
      data: {
        todayVisitors,
        yesterdayVisitors,
        trend,
        pendingApprovals,
        currentlyInside,
        preApproved,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();

    const visitorFilter = req.user.role === 'HOST' ? { hostId: req.user._id } : {};

    const [statusBreakdown, purposeBreakdown, dailyTrend, peakHours] = await Promise.all([
      // Status distribution
      Visitor.aggregate([
        { $match: { ...visitorFilter, visitDate: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Purpose distribution
      Visitor.aggregate([
        { $match: { ...visitorFilter, visitDate: { $gte: start, $lte: end } } },
        { $group: { _id: '$purpose', count: { $sum: 1 } } },
      ]),
      // Daily visitor trend (last 7 days)
      Visitor.aggregate([
        {
          $match: {
            ...visitorFilter,
            visitDate: { $gte: new Date(Date.now() - 7 * 86400000), $lte: new Date() },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Peak visiting hours
      Visit.aggregate([
        { $match: { checkInTime: { $gte: start, $lte: end } } },
        { $group: { _id: { $hour: '$checkInTime' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalVisitors = await Visitor.countDocuments({
      ...visitorFilter,
      visitDate: { $gte: start, $lte: end },
    });

    res.status(200).json({
      success: true,
      data: {
        totalVisitors,
        statusBreakdown,
        purposeBreakdown,
        dailyTrend,
        peakHours,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getAnalytics };
