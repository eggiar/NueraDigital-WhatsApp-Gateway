const prisma = require('../lib/prisma');

// @desc    Get all rules
// @route   GET /api/auto-reply
exports.getRules = async (req, res, next) => {
  try {
    const rules = await prisma.autoReplyRule.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

// @desc    Create rule
// @route   POST /api/auto-reply
exports.createRule = async (req, res, next) => {
  try {
    const { keyword, response, isAI, schedule } = req.body;

    if (!keyword) {
      return res.status(400).json({ success: false, error: 'Keyword is required' });
    }

    // Default response for AI if empty string is provided, though usually AI generates on the fly
    const rule = await prisma.autoReplyRule.create({
      data: {
        userId: req.user.id,
        keyword: keyword.toLowerCase(),
        response: response || (isAI ? '' : null),
        isAI: isAI || false,
        schedule
      }
    });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Update rule
// @route   PUT /api/auto-reply/:id
exports.updateRule = async (req, res, next) => {
  try {
    const { keyword, response, isAI, schedule } = req.body;

    let rule = await prisma.autoReplyRule.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    rule = await prisma.autoReplyRule.update({
      where: { id: req.params.id },
      data: { 
          keyword: keyword ? keyword.toLowerCase() : undefined, 
          response, 
          isAI, 
          schedule 
      }
    });

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete rule
// @route   DELETE /api/auto-reply/:id
exports.deleteRule = async (req, res, next) => {
  try {
    const rule = await prisma.autoReplyRule.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    await prisma.autoReplyRule.delete({ where: { id: req.params.id } });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
