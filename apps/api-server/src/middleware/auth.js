const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const auth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-api-key']) {
      // API Key support
      const apiKeyStr = req.headers['x-api-key'];
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: apiKeyStr },
        include: { user: { include: { roles: { include: { role: true } } } } }
      });
      
      if (!apiKey) {
        return res.status(401).json({ success: false, error: 'Invalid API Key' });
      }
      
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() }
      });
      
      req.user = apiKey.user;
      return next();
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Attach user to request
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }
    
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Your account is suspended' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    console.error('Auth error:', error);
    res.status(401).json({ success: false, error: 'Not authorized' });
  }
};

module.exports = auth;
