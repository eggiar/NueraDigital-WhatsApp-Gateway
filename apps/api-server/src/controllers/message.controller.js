const prisma = require('../lib/prisma');
const waService = require('../services/whatsapp.service');

// Format phone number to JID
const formatPhoneToJid = (phone) => {
  let formatted = phone.replace(/\D/g, '');
  // Assuming Indonesian numbers for now if starts with 0
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  if (!formatted.endsWith('@s.whatsapp.net')) {
    formatted = `${formatted}@s.whatsapp.net`;
  }
  return formatted;
};

// @desc    Send Text Message
// @route   POST /api/messages/send
exports.sendMessage = async (req, res, next) => {
  try {
    const { deviceId, to, message } = req.body;

    if (!deviceId || !to || !message) {
      return res.status(400).json({ success: false, error: 'deviceId, to, and message are required' });
    }

    // Verify format and device ownership
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    
    if (!waService.isSessionConnected(deviceId)) {
      return res.status(400).json({ success: false, error: 'Device is not connected' });
    }

    const jid = formatPhoneToJid(to);
    const socket = waService.sessions.get(deviceId);
    
    // Send message using Baileys
    const sentMsg = await socket.sendMessage(jid, { text: message });

    // Log message
    await prisma.message.create({
      data: {
        deviceId,
        to,
        type: 'TEXT',
        content: message,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    res.status(200).json({ success: true, message: 'Message sent success', data: sentMsg });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Message to Group
// @route   POST /api/messages/send-group
exports.sendGroupMessage = async (req, res, next) => {
  try {
    const { deviceId, groupId, message } = req.body;

    if (!deviceId || !groupId || !message) {
      return res.status(400).json({ success: false, error: 'deviceId, groupId, and message are required' });
    }

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    if (!waService.isSessionConnected(deviceId)) {
      return res.status(400).json({ success: false, error: 'Device is not connected' });
    }

    // Group ID check
    let jid = groupId;
    if (!jid.endsWith('@g.us')) {
      jid = `${jid}@g.us`;
    }

    const socket = waService.sessions.get(deviceId);
    const sentMsg = await socket.sendMessage(jid, { text: message });

    await prisma.message.create({
      data: {
        deviceId,
        to: groupId,
        type: 'TEXT',
        content: message,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    res.status(200).json({ success: true, message: 'Group message sent', data: sentMsg });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Media Message
// @route   POST /api/messages/send-media
exports.sendMediaMessage = async (req, res, next) => {
  try {
    const { deviceId, to, mediaUrl, caption, mediaType } = req.body;
    // Note: To support complex media sending, might need multer integration.
    // For now we accept a direct mediaUrl to send from URL.

    if (!deviceId || !to || !mediaUrl || !mediaType) {
      return res.status(400).json({ success: false, error: 'deviceId, to, mediaUrl, mediaType are required' });
    }

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    if (!waService.isSessionConnected(deviceId)) {
      return res.status(400).json({ success: false, error: 'Device is not connected' });
    }

    const jid = formatPhoneToJid(to);
    const socket = waService.sessions.get(deviceId);
    
    let msgOptions = {};
    if (mediaType === 'IMAGE') msgOptions = { image: { url: mediaUrl }, caption };
    else if (mediaType === 'VIDEO') msgOptions = { video: { url: mediaUrl }, caption };
    else if (mediaType === 'DOCUMENT') msgOptions = { document: { url: mediaUrl }, fileName: caption, mimetype: 'application/pdf' }; // assuming PDF for now

    const sentMsg = await socket.sendMessage(jid, msgOptions);

    await prisma.message.create({
      data: {
        deviceId,
        to,
        type: mediaType,
        content: `MediaUrl: ${mediaUrl} | Caption: ${caption || ''}`,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    res.status(200).json({ success: true, message: 'Media message sent', data: sentMsg });
  } catch (error) {
    next(error);
  }
};

// @desc    Update WhatsApp Status
// @route   POST /api/messages/status-update
exports.sendStatusMessage = async (req, res, next) => {
  try {
    const { deviceId, text, backgroundColor, font, mediaType, mediaUrl } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }
    
    if (!text && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'text or mediaUrl is required' });
    }

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    if (!waService.isSessionConnected(deviceId)) {
      return res.status(400).json({ success: false, error: 'Device is not connected' });
    }

    const socket = waService.sessions.get(deviceId);
    
    // Status update in Baileys requires broadcasting to standard status JID
    const jid = 'status@broadcast';

    // Fetch all contacts for this user to build the statusJidList so they can actually see the status
    const contacts = await prisma.contact.findMany({
        where: { userId: req.user.id }
    });
    
    // We add the user's own device phone number to the list as well (required by WhatsApp)
    const statusJidList = contacts.map(c => formatPhoneToJid(c.phone));
    if (device.phone) {
        statusJidList.push(formatPhoneToJid(device.phone));
    }

    let msgOptions = {};
    
    if (mediaType === 'IMAGE' && mediaUrl) {
        msgOptions = { image: { url: mediaUrl }, caption: text || '' };
    } else if (mediaType === 'VIDEO' && mediaUrl) {
        msgOptions = { video: { url: mediaUrl }, caption: text || '' };
    } else {
        msgOptions = { 
            text: text || '', 
            backgroundColor: backgroundColor || '#000000', 
            font: font || 1
        };
    }

    const sentMsg = await socket.sendMessage(jid, msgOptions, {
        statusJidList
    });

    await prisma.message.create({
      data: {
        deviceId,
        to: 'STATUS',
        type: 'TEXT',
        content: text,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    res.status(200).json({ success: true, message: 'Status updated', data: sentMsg });
  } catch (error) {
    next(error);
  }
};

