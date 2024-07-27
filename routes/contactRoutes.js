const express = require('express');

const authMiddleware = require('../middlewares/authMiddleware');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.route('/create-contact').post(contactController.createContact);

router
  .route('/get-contacts')
  .get(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    contactController.getContacts
  );

router
  .route('/get-contact/:id')
  .get(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    contactController.getContact
  );

router
  .route('/update-contact/:id')
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    contactController.updateContact
  );

router
  .route('/delete-contact/:id')
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    contactController.deleteContact
  );

module.exports = router;
