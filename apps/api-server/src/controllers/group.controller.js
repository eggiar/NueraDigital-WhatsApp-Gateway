const prisma = require('../lib/prisma');
const waService = require('../services/whatsapp.service');

// @desc    Get groups from DB
// @route   GET /api/groups/:deviceId
exports.getGroups = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });

    const groups = await prisma.group.findMany({
      where: { deviceId },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    next(error);
  }
};

// @desc    Refetch groups from WhatsApp and save to DB
// @route   POST /api/groups/:deviceId/refetch
exports.refetchGroups = async (req, res, next) => {
  try {
    const { deviceId } = req.params;

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.user.id }
    });

    if (!device) return res.status(404).json({ success: false, error: 'Device not found' });
    
    if (!waService.isSessionConnected(deviceId)) {
      return res.status(400).json({ success: false, error: 'Device is not connected' });
    }

    const socket = waService.sessions.get(deviceId);
    
    // Fetch all groups from Baileys
    const allGroups = await socket.groupFetchAllParticipating();
    const groupsArray = Object.values(allGroups);

    // Filter properties to save
    const parsedGroups = groupsArray.map(g => ({
      deviceId,
      jid: g.id,
      name: g.subject,
      memberCount: g.participants ? g.participants.length : 0
    }));

    // Update DB (clear old, insert new)
    // First, let's delete existing for this device
    await prisma.group.deleteMany({ where: { deviceId } });
    
    if (parsedGroups.length > 0) {
      await prisma.group.createMany({
        data: parsedGroups
      });
    }

    res.status(200).json({ success: true, message: `Fetched ${parsedGroups.length} groups`, data: parsedGroups });
  } catch (error) {
    next(error);
  }
};
