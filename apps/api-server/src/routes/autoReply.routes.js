const express = require('express');
const { getRules, createRule, updateRule, deleteRule } = require('../controllers/autoReply.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.route('/')
  .get(getRules)
  .post(createRule);

router.route('/:id')
  .put(updateRule)
  .delete(deleteRule);

module.exports = router;
