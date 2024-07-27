const express = require('express');

const authMiddleware = require('../middlewares/authMiddleware');
const bagController = require('../controllers/bagController');

const router = express.Router();

router.route('/get-bags').get(bagController.getBags);

router
  .route('/get-bag/:id')
  .get(
    authMiddleware.protect,
    authMiddleware.restrictTo(['admin', 'user']),
    bagController.getBag
  );

router
  .route('/create-bag')
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    bagController.uploadBagsImage,
    bagController.uploadToServer,
    bagController.uploadToCloud,
    bagController.createBag
  );

router.route('/update-bag/:id').patch(
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  bagController.uploadBagsImage,
  // bagController.uploadToCloud,
  bagController.updateBag
);

router
  .route('/delete-bag/:id')
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    bagController.deleteBag
  );

router.route('/downloadImages').post(bagController.downloadImages);

router.route('/get-categories').get(bagController.getCategories);

router.route('/get-sub-categories').get(bagController.getSubCategories);

router
  .route('/update-category')
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    bagController.updateCategory
  );

module.exports = router;
