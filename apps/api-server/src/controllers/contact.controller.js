const prisma = require('../lib/prisma');

// @desc    Get contacts
// @route   GET /api/contacts
exports.getContacts = async (req, res, next) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
};

// @desc    Create contact
// @route   POST /api/contacts
exports.createContact = async (req, res, next) => {
  try {
    const { name, phone, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Please provide name and phone' });
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.user.id,
        name,
        phone,
        notes
      }
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact
// @route   PUT /api/contacts/:id
exports.updateContact = async (req, res, next) => {
  try {
    const { name, phone, notes } = req.body;

    let contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { name, phone, notes }
    });

    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact
// @route   DELETE /api/contacts/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    await prisma.contact.delete({ where: { id: req.params.id } });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
