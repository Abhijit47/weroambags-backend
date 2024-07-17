const express = require('express');

const router = express.Router();

const orderControllers = require('../controllers/orderControllers');

router.get('/get-orders', orderControllers.getOrders);

router.post(
  '/create-order',
  orderControllers.createOrder,
  orderControllers.createPaymentLink
);

router.post('/verify-payment', orderControllers.verifyPayment);

router.get('/get-order/:id', orderControllers.getOrderById);

router.patch('/update-order/:id', orderControllers.updateOrderById);

router.delete('/delete-order/:id', orderControllers.deleteOrderById);

module.exports = router;
