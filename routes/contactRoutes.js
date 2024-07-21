const express = require('express');

const contactController = require('../controllers/contactController');

const router = express.Router();

router.route('/create-contact').post(contactController.createContact);

router.route('/get-contacts').get(contactController.getContacts);

router.route('/get-contact/:id').get(contactController.getContact);

router.route('/update-contact/:id').patch(contactController.updateContact);

router.route('/delete-contact/:id').delete(contactController.deleteContact);

module.exports = router;
