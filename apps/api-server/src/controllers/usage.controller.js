const prisma = require('../lib/prisma');

// @desc    Get usage logs for user
// @route   GET /api/usage
exports.getUsage = async (req, res, next) => {
  try {
    const logs = await prisma.usageLog.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      take: 30 // Get last 30 days
    });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
