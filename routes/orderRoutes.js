const express = require('express');

const router = express.Router();

const authMiddleware = require('../middlewares/authMiddleware');
const orderControllers = require('../controllers/orderControllers');

router
  .route('/get-orders')
  .get(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    orderControllers.getOrders
  );

router
  .route('/create-order')
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('user'),
    orderControllers.createOrder,
    orderControllers.createPaymentLink
  );

router
  .route('/verify-payment')
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('user'),
    orderControllers.verifyPayment
  );

router.get('/get-order/:id', orderControllers.getOrderById);

router.patch('/update-order/:id', orderControllers.updateOrderById);

router.delete('/delete-order/:id', orderControllers.deleteOrderById);

module.exports = router;
