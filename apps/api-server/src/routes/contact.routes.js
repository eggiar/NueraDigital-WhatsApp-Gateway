const express = require('express');
const { getContacts, createContact, updateContact, deleteContact } = require('../controllers/contact.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.route('/')
  .get(getContacts)
  .post(createContact);

router.route('/:id')
  .put(updateContact)
  .delete(deleteContact);

module.exports = router;
