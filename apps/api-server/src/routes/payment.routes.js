const express = require('express');
const { createTransaction, midtransWebhook } = require('../controllers/payment.controller');
const auth = require('../middleware/auth');

const router = express.Router();

// Midtrans webhook must be accessible publicly
router.post('/webhook', express.json(), midtransWebhook);

// Protected routes
router.use(auth);
router.post('/create-transaction', createTransaction);

module.exports = router;
