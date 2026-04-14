const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ success: false, error: 'User roles not found' });
    }

    const userRoles = req.user.roles.map(r => r.role.name);
    
    // Superadmin has access to everything
    if (userRoles.includes('superadmin')) {
      return next();
    }

    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        error: `User role is not authorized to access this route. Required: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

module.exports = rbac;
