const prisma = require('../lib/prisma');
const waService = require('../services/whatsapp.service');

// @desc    Get all devices for logged in user
// @route   GET /api/devices
exports.getDevices = async (req, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    // Supplement with real-time status
    for (let device of devices) {
      if (waService.isSessionConnected(device.id)) {
        device.status = 'CONNECTED';
      }
    }

    res.status(200).json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
exports.getDevice = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    if (waService.isSessionConnected(device.id)) {
      device.status = 'CONNECTED';
    }

    res.status(200).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new device
// @route   POST /api/devices
exports.createDevice = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Device name is required' });
    }

    // Optional: check plan limit
    // const currentDevices = await prisma.device.count({ where: { userId: req.user.id } });
    // if (currentDevices >= PLAN_LIMIT) return error...

    const device = await prisma.device.create({
      data: {
        userId: req.user.id,
        name
      }
    });

    // Start session creation
    waService.startSession(device.id);

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
exports.deleteDevice = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    // Stop WA session and delete folder
    await waService.deleteSession(device.id);

    await prisma.device.delete({ where: { id: device.id } });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Get QR Code via SSE stream
// @route   GET /api/devices/:id/qr
exports.getDeviceQr = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    // We'll use Server-Sent Events (SSE) for easy streaming of QR
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Check if connected
    if (waService.isSessionConnected(device.id)) {
      res.write("data: " + JSON.stringify({ status: 'CONNECTED' }) + "\n\n");
      return res.end();
    }

    // Listen to waService events for this device (assuming implementation)
    const handleQrUpdate = (qr) => res.write("data: " + JSON.stringify({ status: 'QR', qr }) + "\n\n");
    const handleConnected = () => {
      res.write("data: " + JSON.stringify({ status: 'CONNECTED' }) + "\n\n");
      res.end();
    };

    waService.on(`qr-${device.id}`, handleQrUpdate);
    waService.on(`connected-${device.id}`, handleConnected);

    // If session doesn't exist, start one
    if (!waService.sessions.has(device.id)) {
       waService.startSession(device.id);
    } else {
       // if waiting for qr, the qr is usually emitted by Baileys.
       // we might need to resend the latest stored QR
       const cachedQr = waService.getLatestQr(device.id);
       if (cachedQr) handleQrUpdate(cachedQr);
    }

    req.on('close', () => {
      waService.removeListener(`qr-${device.id}`, handleQrUpdate);
      waService.removeListener(`connected-${device.id}`, handleConnected);
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect device
// @route   POST /api/devices/:id/disconnect
exports.disconnectDevice = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    waService.logoutSession(device.id);

    res.status(200).json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get status
// @route   GET /api/devices/:id/status
exports.statusDevice = async (req, res, next) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    const isConnected = waService.isSessionConnected(device.id);
    res.status(200).json({ success: true, connected: isConnected });
  } catch (error) {
    next(error);
  }
};
