const express = require('express');
const { getGroups, refetchGroups } = require('../controllers/group.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/:deviceId', getGroups);
router.post('/:deviceId/refetch', refetchGroups);

module.exports = router;
