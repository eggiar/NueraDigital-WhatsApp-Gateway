const express = require('express');
const { getAiConfigs, upsertAiConfig, testAiConfig } = require('../controllers/aiConfig.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getAiConfigs);
router.post('/', upsertAiConfig);
router.put('/', upsertAiConfig);
router.post('/test', testAiConfig);

module.exports = router;
