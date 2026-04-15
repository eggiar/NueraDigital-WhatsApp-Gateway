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

// @desc    Bulk import contacts
// @route   POST /api/contacts/import
exports.importContacts = async (req, res, next) => {
  try {
    const rawContacts = Array.isArray(req.body.contacts) ? req.body.contacts : [];

    if (rawContacts.length === 0) {
      return res.status(400).json({ success: false, error: 'Contacts array is required' });
    }

    const contacts = rawContacts
      .map((contact) => ({
        name: String(contact.name || '').trim(),
        phone: String(contact.phone || '').trim(),
        notes: contact.notes ? String(contact.notes) : null
      }))
      .filter((contact) => contact.name && contact.phone);

    if (contacts.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid contacts found to import' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let skipped = 0;

      for (const contact of contacts) {
        const existing = await tx.contact.findFirst({
          where: {
            userId: req.user.id,
            phone: contact.phone
          }
        });

        if (existing) {
          skipped += 1;
          continue;
        }

        await tx.contact.create({
          data: {
            userId: req.user.id,
            name: contact.name,
            phone: contact.phone,
            notes: contact.notes
          }
        });
        created += 1;
      }

      return { created, skipped };
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Imported ${result.created} contacts`
    });
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
