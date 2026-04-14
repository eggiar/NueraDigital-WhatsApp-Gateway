const express = require('express');
const { getUsers, suspendUser, changeUserRole, getAllDevices, getAllTransactions, getStats, getSystemConfigs, updateSystemConfig } = require('../controllers/admin.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

router.use(auth);
// For general admin endpoints
const adminCheck = rbac('admin', 'superadmin');
const superAdminCheck = rbac('superadmin');

// Admin Level
router.get('/users', adminCheck, getUsers);
router.put('/users/:id/suspend', adminCheck, suspendUser);
router.put('/users/:id/role', superAdminCheck, changeUserRole);

router.get('/devices', adminCheck, getAllDevices);
router.get('/transactions', adminCheck, getAllTransactions);
router.get('/stats', adminCheck, getStats);

// SuperAdmin Level
router.get('/system-config', superAdminCheck, getSystemConfigs);
router.put('/system-config', superAdminCheck, updateSystemConfig);

module.exports = router;
