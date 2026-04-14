const prisma = require('../lib/prisma');

// @desc    Get all plans
// @route   GET /api/plans
// @access  Public
exports.getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
        orderBy: { price: 'asc' }
    });

    // parse feature json to return array/object instead of string
    const parsedPlans = plans.map(p => ({
        ...p,
        features: JSON.parse(p.features)
    }));

    res.status(200).json({ success: true, data: parsedPlans });
  } catch (error) {
    next(error);
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
exports.getPlanById = async (req, res, next) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params.id }
    });

    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    plan.features = JSON.parse(plan.features);
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Create plan
// @route   POST /api/plans
// @access  Private/SuperAdmin
exports.createPlan = async (req, res, next) => {
  try {
    const { name, price, deviceLimit, msgLimit, features } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        price: parseFloat(price),
        deviceLimit: parseInt(deviceLimit, 10),
        msgLimit: parseInt(msgLimit, 10),
        features: JSON.stringify(features || [])
      }
    });

    plan.features = JSON.parse(plan.features);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Update plan
// @route   PUT /api/plans/:id
// @access  Private/SuperAdmin
exports.updatePlan = async (req, res, next) => {
  try {
    const { name, price, deviceLimit, msgLimit, features } = req.body;

    let plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        name,
        price: price !== undefined ? parseFloat(price) : undefined,
        deviceLimit: deviceLimit !== undefined ? parseInt(deviceLimit, 10) : undefined,
        msgLimit: msgLimit !== undefined ? parseInt(msgLimit, 10) : undefined,
        features: features !== undefined ? JSON.stringify(features) : undefined
      }
    });

    plan.features = JSON.parse(plan.features);
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/:id
// @access  Private/SuperAdmin
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    await prisma.plan.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
