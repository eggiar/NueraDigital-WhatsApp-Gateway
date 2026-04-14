const prisma = require('../lib/prisma');
const webhookService = require('../services/webhook.service');

// @desc    Get webhooks
// @route   GET /api/webhooks
exports.getWebhooks = async (req, res, next) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
          _count: { select: { logs: true } }
      }
    });

    // Parse events array from DB
    const processed = webhooks.map(w => ({
        ...w,
        events: JSON.parse(w.events)
    }));

    res.status(200).json({ success: true, data: processed });
  } catch (error) {
    next(error);
  }
};

// @desc    Create webhook
// @route   POST /api/webhooks
exports.createWebhook = async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, error: 'Url and events array are required' });
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId: req.user.id,
        url,
        events: JSON.stringify(events),
        secret
      }
    });

    webhook.events = JSON.parse(webhook.events);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
};

// @desc    Update webhook
// @route   PUT /api/webhooks/:id
exports.updateWebhook = async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;

    let webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });

    webhook = await prisma.webhook.update({
      where: { id: req.params.id },
      data: { 
          url, 
          events: events ? JSON.stringify(events) : undefined, 
          secret 
      }
    });

    webhook.events = JSON.parse(webhook.events);
    res.status(200).json({ success: true, data: webhook });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete webhook
// @route   DELETE /api/webhooks/:id
exports.deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });

    await prisma.webhook.delete({ where: { id: req.params.id } });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Test webhook
// @route   POST /api/webhooks/:id/test
exports.testWebhook = async (req, res, next) => {
    try {
        const webhook = await prisma.webhook.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });
      
        if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
        
        await webhookService.sendEvent(webhook.id, 'ping', { message: 'Test webhook payload' });

        res.status(200).json({ success: true, message: 'Test event dispatched' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get Webhook Logs
// @route   GET /api/webhooks/:id/logs
exports.getWebhookLogs = async (req, res, next) => {
    try {
      const webhook = await prisma.webhook.findFirst({
          where: { id: req.params.id, userId: req.user.id }
      });
    
      if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
      
      const logs = await prisma.webhookLog.findMany({
          where: { webhookId: webhook.id },
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit to 50
      });
  
      const processed = logs.map(l => ({ ...l, payload: JSON.parse(l.payload) }));

      res.status(200).json({ success: true, data: processed });
    } catch (error) {
        next(error);
    }
}
