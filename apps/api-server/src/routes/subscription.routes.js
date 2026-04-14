const express = require('express');
const { getSubscription, createSubscription } = require('../controllers/subscription.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getSubscription);
router.post('/subscribe', createSubscription);

module.exports = router;
