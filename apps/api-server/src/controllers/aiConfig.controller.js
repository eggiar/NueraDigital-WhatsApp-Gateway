const prisma = require('../lib/prisma');

// @desc    Get User AI Configs
// @route   GET /api/ai-config
exports.getAiConfigs = async (req, res, next) => {
  try {
    const configs = await prisma.aiConfig.findMany({
      where: { userId: req.user.id }
    });

    // In a real production app, never return the full API key. Mask it.
    const safeConfigs = configs.map(c => ({
        ...c,
        apiKey: c.apiKey ? `****${c.apiKey.slice(-4)}` : ''
    }));

    res.status(200).json({ success: true, data: safeConfigs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update AI config
// @route   POST /api/ai-config
exports.upsertAiConfig = async (req, res, next) => {
  try {
    const { provider, apiKey, model } = req.body;

    if (!provider || !apiKey || !model) {
      return res.status(400).json({ success: false, error: 'Provider, apiKey, and model are required' });
    }

    let config = await prisma.aiConfig.findFirst({
        where: { userId: req.user.id, provider }
    });

    if (config) {
        config = await prisma.aiConfig.update({
            where: { id: config.id },
            data: { apiKey, model }
        });
    } else {
        config = await prisma.aiConfig.create({
            data: {
                userId: req.user.id,
                provider,
                apiKey,
                model
            }
        });
    }

    res.status(200).json({ success: true, data: { ...config, apiKey: `****${config.apiKey.slice(-4)}` } });
  } catch (error) {
    next(error);
  }
};

// @desc    Test AI config presence
// @route   POST /api/ai-config/test
exports.testAiConfig = async (req, res, next) => {
  try {
    const { provider } = req.body;

    const config = await prisma.aiConfig.findFirst({
      where: {
        userId: req.user.id,
        ...(provider ? { provider } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!config) {
      return res.status(404).json({ success: false, error: 'AI config not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        provider: config.provider,
        model: config.model,
        connected: true
      }
    });
  } catch (error) {
    next(error);
  }
};
