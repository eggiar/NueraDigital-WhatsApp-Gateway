const prisma = require('../lib/prisma');

// @desc    Get all users
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            status: true,
            createdAt: true,
            roles: { include: { role: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    // Format response
    const formatted = users.map(u => ({
        ...u,
        roles: u.roles.map(r => r.role.name)
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend/Unsuspend user
// @route   PUT /api/admin/users/:id/suspend
exports.suspendUser = async (req, res, next) => {
    try {
        const { status } = req.body; // 'ACTIVE' or 'SUSPENDED'

        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { status }
        });

        res.status(200).json({ success: true, message: `User status changed to ${status}` });
    } catch (error) {
        next(error);
    }
};

// @desc    Change User Role
// @route   PUT /api/admin/users/:id/role
exports.changeUserRole = async (req, res, next) => {
    try {
        const { roleName } = req.body;

        const targetRole = await prisma.role.findUnique({ where: { name: roleName }});
        if (!targetRole) return res.status(404).json({ success: false, error: 'Role not found' });

        // Update role
        await prisma.userRole.deleteMany({ where: { userId: req.params.id }});
        await prisma.userRole.create({
            data: {
                userId: req.params.id,
                roleId: targetRole.id
            }
        });

        res.status(200).json({ success: true, message: `Role changed to ${roleName}` });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all Devices
// @route   GET /api/admin/devices
exports.getAllDevices = async (req, res, next) => {
    try {
        const devices = await prisma.device.findMany({
            include: { user: { select: { name: true, email: true }}},
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: devices });
    } catch (error) {
         next(error);
    }
}

// @desc    Get all transactions
// @route   GET /api/admin/transactions
exports.getAllTransactions = async (req, res, next) => {
    try {
        const transactions = await prisma.transaction.findMany({
            include: { 
                user: { select: { name: true, email: true }},
                plan: { select: { name: true }}
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        next(error);
    }
}

// @desc    Get System Stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
    try {
        const userCount = await prisma.user.count();
        const deviceCount = await prisma.device.count();
        const messageCount = await prisma.message.count();
        const activeSubs = await prisma.subscription.count({ where: { status: 'ACTIVE' }});

        res.status(200).json({
            success: true,
            data: { userCount, deviceCount, messageCount, activeSubs }
        });
    } catch (error) {
        next(error);
    }
}

// @desc    Get System Configs
// @route   GET /api/admin/system-config
exports.getSystemConfigs = async (req, res, next) => {
    try {
        const configs = await prisma.systemConfig.findMany();
        res.status(200).json({ success: true, data: configs });
    } catch (error) {
        next(error);
    }
}

// @desc    Upsert System Config
// @route   PUT /api/admin/system-config
exports.updateSystemConfig = async (req, res, next) => {
    try {
        const { key, value, description } = req.body;
        
        const config = await prisma.systemConfig.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description }
        });

        res.status(200).json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
}
