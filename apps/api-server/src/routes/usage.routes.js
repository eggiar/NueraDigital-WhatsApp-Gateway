const express = require('express');
const { getUsage } = require('../controllers/usage.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getUsage);

module.exports = router;
