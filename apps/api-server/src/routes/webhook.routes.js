const express = require('express');
const { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, getWebhookLogs } = require('../controllers/webhook.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.route('/')
  .get(getWebhooks)
  .post(createWebhook);

router.route('/:id')
  .put(updateWebhook)
  .delete(deleteWebhook);

router.post('/:id/test', testWebhook);
router.get('/:id/logs', getWebhookLogs);

module.exports = router;
