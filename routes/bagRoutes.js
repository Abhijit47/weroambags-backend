const express = require('express');

const bagController = require('../controllers/bagController');

const router = express.Router();

router.route('/get-bags').get(bagController.getBags);

router.route('/get-bag/:id').get(bagController.getBag);

router
  .route('/create-bag')
  .post(bagController.uploadBagsImage, bagController.createBag);

router.route('/update-bag/:id').patch(bagController.updateBag);

router.route('/delete-bag/:id').delete(bagController.deleteBag);

router.route('/downloadImages').post(bagController.downloadImages);

module.exports = router;
