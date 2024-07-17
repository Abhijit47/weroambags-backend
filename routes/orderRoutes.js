const express = require('express');

const router = express.Router();

const orderControllers = require('../controllers/orderControllers');

router.get('/', orderControllers.getOrders);

router.post('/', orderControllers.createOrder);

router.get('/:id', orderControllers.getOrderById);

router.patch('/:id', orderControllers.updateOrderById);

router.delete('/:id', orderControllers.deleteOrderById);

module.exports = router;
