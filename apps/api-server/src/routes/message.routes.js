const express = require('express');
const {
  getMessages,
  sendMessage,
  sendGroupMessage,
  sendMediaMessage,
  sendStatusMessage
} = require('../controllers/message.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getMessages);
router.post('/send', sendMessage);
router.post('/send-group', sendGroupMessage);
router.post('/send-media', sendMediaMessage);
router.post('/status-update', sendStatusMessage);

module.exports = router;
