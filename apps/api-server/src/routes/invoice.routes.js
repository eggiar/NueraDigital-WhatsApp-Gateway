const express = require('express');
const auth = require('../middleware/auth');
const { getInvoices } = require('../controllers/invoice.controller');

const router = express.Router();

router.use(auth);

router.get('/', getInvoices);

module.exports = router;
