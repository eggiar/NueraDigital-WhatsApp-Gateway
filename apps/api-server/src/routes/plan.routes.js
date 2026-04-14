const express = require('express');
const { getPlans, getPlanById, createPlan, updatePlan, deletePlan } = require('../controllers/plan.controller');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Public route to get active plans
router.get('/', getPlans);
router.get('/:id', getPlanById);

// Admin / Superadmin routes
router.use(auth);
router.use(rbac('superadmin'));

router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
