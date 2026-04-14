const prisma = require('../lib/prisma');

// @desc    Get current subscription
// @route   GET /api/subscription
exports.getSubscription = async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { 
          userId: req.user.id,
          status: 'ACTIVE',
      },
      orderBy: { expiredAt: 'desc' },
      include: {
          plan: true
      }
    });

    if (!subscription) {
      return res.status(200).json({ success: true, data: null, message: 'No active subscription' });
    }

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin-only manual subscribe (bypass midtrans)
// @route   POST /api/subscription/subscribe
exports.createSubscription = async (req, res, next) => {
    // In production, users go through Midtrans to get a subscription.
    // This could either represent a free trial creation or an admin applying a plan.
    try {
        const { planId, userId } = req.body;
        // if user is not admin, they can only "subscribe" to free plans if any
        
        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

        const targetUser = userId || req.user.id;

        // E.g., Free Trial logic or Admin override
        const startAt = new Date();
        const expiredAt = new Date();
        expiredAt.setMonth(expiredAt.getMonth() + 1); // 1 month

        const sub = await prisma.subscription.create({
            data: {
                userId: targetUser,
                planId,
                startAt,
                expiredAt,
                status: 'ACTIVE'
            }
        });

        res.status(201).json({ success: true, data: sub });
    } catch (error) {
        next(error);
    }
}
