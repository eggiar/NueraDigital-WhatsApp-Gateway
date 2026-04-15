const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt'); // or bcryptjs
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/email.service');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default role 'user'
    let userRole = await prisma.role.findUnique({ where: { name: 'user' } });
    if (!userRole) {
      userRole = await prisma.role.create({ data: { name: 'user' } });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roles: {
          create: {
            roleId: userRole.id
          }
        }
      }
    });

    // Send Welcome Email Async
    emailService.sendWelcomeEmail(user.email, user.name).catch(console.error);

    const token = signToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Your account is suspended' });
    }

    const token = signToken(user.id);

    const roles = user.roles.map(r => r.role.name);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });
    
    // Convert to response safe format (no password)
    const { password, ...safeUser } = user;
    safeUser.roles = safeUser.roles.map(r => r.role.name);

    res.status(200).json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user.id }
      }
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roles: user.roles.map((role) => role.role.name)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change current user password
// @route   PUT /api/auth/password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Old and new password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Old password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user API keys
// @route   GET /api/auth/api-keys
// @access  Private
exports.getApiKeys = async (req, res, next) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: apiKeys });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user API key
// @route   POST /api/auth/api-keys
// @access  Private
exports.createApiKey = async (req, res, next) => {
  try {
    const key = `ndwa_${crypto.randomBytes(24).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        key
      }
    });

    res.status(201).json({ success: true, data: apiKey });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user API key
// @route   DELETE /api/auth/api-keys/:id
// @access  Private
exports.deleteApiKey = async (req, res, next) => {
  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    await prisma.apiKey.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
