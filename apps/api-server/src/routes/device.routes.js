const express = require('express');
const { getDevices, getDevice, createDevice, deleteDevice, getDeviceQr, statusDevice, disconnectDevice } = require('../controllers/device.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth); // Require auth for all device routes

router.route('/')
  .get(getDevices)
  .post(createDevice);

router.route('/:id')
  .get(getDevice)
  .delete(deleteDevice);

router.get('/:id/qr', getDeviceQr);
router.post('/:id/disconnect', disconnectDevice);
router.get('/:id/status', statusDevice);

module.exports = router;
