const express = require('express');

const bagController = require('../controllers/bagController');

const router = express.Router();

router.route('/get-bags').get(bagController.getBags);

router.route('/get-bag/:id').get(bagController.getBag);

router
  .route('/create-bag')
  .post(
    bagController.uploadBagsImage,
    bagController.uploadToServer,
    bagController.uploadToCloud,
    bagController.createBag
  );

router.route('/update-bag/:id').patch(
  bagController.uploadBagsImage,
  // bagController.uploadToCloud,
  bagController.updateBag
);

router.route('/delete-bag/:id').delete(bagController.deleteBag);

router.route('/downloadImages').post(bagController.downloadImages);

router.route('/get-categories').get(bagController.getCategories);

router.route('/get-sub-categories').get(bagController.getSubCategories);

router.route('/update-category').patch(bagController.updateCategory);

module.exports = router;
