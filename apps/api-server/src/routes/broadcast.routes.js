const express = require('express');
const { getBroadcasts, getBroadcast, createBroadcast, startBroadcast } = require('../controllers/broadcast.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.route('/')
  .get(getBroadcasts)
  .post(createBroadcast); // usually handles CSV upload and creation

router.route('/:id')
  .get(getBroadcast);

router.post('/:id/start', startBroadcast);

module.exports = router;
