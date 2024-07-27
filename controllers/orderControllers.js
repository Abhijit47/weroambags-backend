const crypto = require('crypto');
const Razorpay = require('razorpay');
var {
  validatePaymentVerification,
} = require('razorpay/dist/utils/razorpay-utils');

const Order = require('../models/orderModel');
const Transaction = require('../models/transactionModel');
const { getFutureTimestamp } = require('../utils/helpers');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = catchAsync(async (req, res, next) => {
  if (!instance) {
    return next(new AppError('Razorpay instance not created', 500));
  }

  const { totalAmount, items, firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email || !phone || !items || !totalAmount) {
    return next(new AppError('All fields are required', 400));
  }

  const receiptNo = crypto.randomUUID();

  const newOrder = await instance.orders.create({
    amount: totalAmount * 100, // amount in the smallest currency unit
    currency: 'INR',
    receipt: receiptNo,
    notes: {
      notes_key_1: 'Tea, Earl Grey, Hot',
      notes_key_2: 'Tea, Earl Grey… decaf.',
    },
  });

  if (!newOrder) {
    return next(new AppError('Order not created', 500));
  }

  const structuredItems = items.map((items) => {
    return {
      id: items._id,
      quantity: items.quantity,
      title: items.title,
      description: items.description,
      price: items.newPrice,
    };
  });

  const orderObj = {
    orderId: newOrder.id,
    name: `${firstName} ${lastName}`,
    email,
    phone,
    orderItems: structuredItems,
    totalAmount,
  };

  const order = await Order.create({
    orderNumber: receiptNo,
    name: `${firstName} ${lastName}`,
    email,
    phone,
    orderItems: items,
    totalAmount,
  });

  if (!order) {
    return next(new AppError('Order not created', 500));
  }

  req.paymentDetails = orderObj;

  next();
});

exports.createPaymentLink = catchAsync(async (req, res, next) => {
  // console.log('req.orderId', req.paymentDetails);

  const { orderId, name, email, phone, orderItems, totalAmount } =
    req.paymentDetails;

  if (!orderId || !name || !email || !phone || !orderItems || !totalAmount) {
    return next(new AppError('All fields are required', 400));
  }

  const paymentLink = await instance.paymentLink.create({
    reference_id: orderId,
    amount: totalAmount * 100, // amount in the smallest currency unit
    currency: 'INR',
    // accept_partial: false,
    // first_min_partial_amount: 0,
    description: 'For purchasing bags',
    customer: {
      name: name,
      email: email,
      contact: phone,
    },
    notify: {
      sms: true,
      email: true,
    },
    reminder_enable: true,
    notes: {
      orderItems: orderItems.map((item) => item.title),
    },
    callback_url: process.env.RAZORPAY_CALLBACK_URL,
    callback_method: 'get',
    // expiry_at: getFutureTimestamp(15),
  });

  return res.status(200).json({
    status: 'success',
    data: {
      payLink: paymentLink.short_url,
      // paymentLink,
    },
  });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  // success?razorpay_payment_id=pay_OZboLU957x0iVe&razorpay_payment_link_id=plink_OZbnWw3nTC7E67&razorpay_payment_link_reference_id=order_OZbnWSdeFR9EjG&razorpay_payment_link_status=paid&razorpay_signature=3d16dee0cb5ceb9e616109bb43e4571454d57095d027daa458abd39ae863025d

  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = req.body;

  if (
    !razorpay_payment_id ||
    !razorpay_payment_link_id ||
    !razorpay_payment_link_reference_id ||
    !razorpay_payment_link_status ||
    !razorpay_signature
  ) {
    return next(new AppError('All fields are required', 400));
  }

  // Means the payment link id is available
  const response = await instance.paymentLink.fetch(razorpay_payment_link_id);

  // console.log('response', response);

  if (response.status !== 'paid') {
    return next(new AppError('Payment not verified', 400));
  }

  // create a new transaction

  const transactionObj = {
    amount: response.amount,
    amount_paid: response.amount_paid,
    created_at: response.created_at,
    customer: {
      contact: response.customer.contact,
      email: response.customer.email,
      name: response.customer.name,
    },
    description: response.description,
    id: response.id,
    order_id: response.order_id,
    reference_id: response.reference_id,
    short_url: response.short_url,
    status: response.status,
    user_id: response.user_id,
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  };

  const transaction = await Transaction.create(transactionObj);

  if (!transaction) {
    return next(new AppError('Transaction not created', 500));
  }

  return res.status(200).json({
    status: 'success',
    message: 'Payment verified',
  });

  /*
  needs to be saved in the database
  {
  "razorpay_payment_id": "pay_29QQoUBi66xm2f",
  "razorpay_order_id": "order_9A33XWu170gUtm",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
  */
});

exports.getOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({});
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.updateOrderById = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.deleteOrderById = async (req, res, next) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
