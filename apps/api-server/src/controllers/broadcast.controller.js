const prisma = require('../lib/prisma');
const waService = require('../services/whatsapp.service');
const { broadcastQueue } = require('../queue/broadcast.worker');

const formatPhoneToJid = (phone) => {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1);
    if (!formatted.endsWith('@s.whatsapp.net')) formatted = `${formatted}@s.whatsapp.net`;
    return formatted;
};

// @desc    Get broadcasts
// @route   GET /api/broadcast
exports.getBroadcasts = async (req, res, next) => {
  try {
    const jobs = await prisma.broadcastJob.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { recipients: true }
        }
      }
    });

    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single broadcast with recipients
// @route   GET /api/broadcast/:id
exports.getBroadcast = async (req, res, next) => {
  try {
    const job = await prisma.broadcastJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        recipients: true
      }
    });

    if (!job) return res.status(404).json({ success: false, error: 'Broadcast not found' });

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

// @desc    Create broadcast (Upload contacts)
// @route   POST /api/broadcast
exports.createBroadcast = async (req, res, next) => {
  try {
    const { name, deviceId, messageType, content, phones } = req.body;
    // Phones should be array of strings ["08123...", "085..."]

    if (!name || !deviceId || !phones || !Array.isArray(phones)) {
       return res.status(400).json({ success: false, error: 'name, deviceId, and phones array are required' });
    }

    const device = await prisma.device.findFirst({ where: { id: deviceId, userId: req.user.id }});
    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    // Store in DB, encode message if media
    let savedContent = content;
    if (typeof content === 'object') {
        savedContent = JSON.stringify(content);
    }

    const job = await prisma.broadcastJob.create({
      data: {
        userId: req.user.id,
        name,
        status: 'DRAFT',
        recipients: {
            create: phones.map(phone => ({ phone }))
        }
      }
    });

    res.status(201).json({ success: true, data: job, message: 'Broadcast draft created. You can start it now.'});
  } catch (error) {
    next(error);
  }
};

// @desc    Start broadcast
// @route   POST /api/broadcast/:id/start
exports.startBroadcast = async (req, res, next) => {
  try {
    const { deviceId, messageType, content } = req.body; 

    const job = await prisma.broadcastJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { recipients: { where: { status: 'PENDING' } } }
    });

    if (!job) return res.status(404).json({ success: false, error: 'Broadcast not found' });
    if (job.status === 'RUNNING' || job.status === 'COMPLETED') {
        return res.status(400).json({ success: false, error: 'Broadcast already running or completed' });
    }

    if (!waService.isSessionConnected(deviceId)) {
        return res.status(400).json({ success: false, error: 'Device is not connected. Connect device first.' });
    }

    let savedContent = content;
    if (typeof content === 'object') savedContent = JSON.stringify(content);

    // Update status to RUNNING
    await prisma.broadcastJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING' }
    });

    // Enqueue
    for (let i = 0; i < job.recipients.length; i++) {
        const recipient = job.recipients[i];
        
        await broadcastQueue.add(`send-${recipient.id}`, {
            recipientId: recipient.id,
            deviceId,
            jid: formatPhoneToJid(recipient.phone),
            messageType: messageType || 'TEXT',
            content: savedContent,
            isLast: i === job.recipients.length - 1
        });
    }

    res.status(200).json({ success: true, message: `Started sending to ${job.recipients.length} recipients` });
  } catch (error) {
    next(error);
  }
};
