const prisma = require('../lib/prisma');

// @desc    Get current user invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        transaction: {
          userId: req.user.id
        }
      },
      include: {
        transaction: {
          include: {
            plan: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: {
        paidAt: 'desc'
      }
    });

    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};
