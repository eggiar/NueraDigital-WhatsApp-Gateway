const express = require('express');
const { getAiConfigs, upsertAiConfig } = require('../controllers/aiConfig.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getAiConfigs);
router.post('/', upsertAiConfig);

module.exports = router;
