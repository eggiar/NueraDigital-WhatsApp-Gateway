const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getApiKeys,
  createApiKey,
  deleteApiKey
} = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword);
router.get('/api-keys', auth, getApiKeys);
router.post('/api-keys', auth, createApiKey);
router.delete('/api-keys/:id', auth, deleteApiKey);

module.exports = router;
