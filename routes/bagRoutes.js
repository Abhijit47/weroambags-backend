const express = require('express');

const bagController = require('../controllers/bagController');

const router = express.Router();

router.route('/getBags').get(bagController.getBags);

router.route('/getBag/:id').get(bagController.getBag);

router
  .route('/createBag')
  .post(bagController.uploadBagsImage, bagController.createBag);

router.route('/updateBag/:id').patch(bagController.updateBag);

router.route('/deleteBag/:id').delete(bagController.deleteBag);

router.route('/downloadImages').post(bagController.downloadImages);

module.exports = router;
