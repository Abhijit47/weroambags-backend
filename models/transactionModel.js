const mongoose = require('mongoose');

/*
{
    "accept_partial": false,
    "amount": 85000,
    "amount_paid": 85000,
    "callback_method": "get",
    "callback_url": "https://weroambags.vercel.app/success",
    "cancelled_at": 0,
    "created_at": 1721199493,
    "currency": "INR",
    "customer": {
        "contact": "9999911111",
        "email": "test@gmail.com",
        "name": "jhon doe"
    },
    "description": "For purchasing bags",
    "expire_by": 0,
    "expired_at": 0,
    "first_min_partial_amount": 0,
    "id": "plink_OZbnWw3nTC7E67",
    "notes": {
        "orderItems": "[dummy bag dummy bag 2]"
    },
    "notify": {
        "email": true,
        "sms": true,
        "whatsapp": false
    },
    "order_id": "order_OZbntM3brs4PvN",
    "payments": [
        {
            "amount": 85000,
            "created_at": 1721199547,
            "method": "card",
            "payment_id": "pay_OZboLU957x0iVe",
            "status": "captured"
        }
    ],
    "reference_id": "order_OZbnWSdeFR9EjG",
    "reminder_enable": true,
    "reminders": {
        "status": "failed"
    },
    "short_url": "https://rzp.io/i/HZz5iuxKb",
    "status": "paid",
    "updated_at": 1721199547,
    "upi_link": false,
    "user_id": "",
    "whatsapp_link": false
}

*/

// success?razorpay_payment_id=pay_OZboLU957x0iVe&razorpay_payment_link_id=plink_OZbnWw3nTC7E67&razorpay_payment_link_reference_id=order_OZbnWSdeFR9EjG&razorpay_payment_link_status=paid&razorpay_signature=3d16dee0cb5ceb9e616109bb43e4571454d57095d027daa458abd39ae863025d

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'A transaction must have an amount'],
    },
    amount_paid: {
      type: Number,
      required: [true, 'A transaction must have an amount paid'],
    },
    created_at: {
      type: Number,
      required: [true, 'A transaction must have a created at timestamp'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    customer: {
      contact: {
        type: String,
        required: [true, 'A transaction must have a customer contact'],
      },
      email: {
        type: String,
        required: [true, 'A transaction must have a customer email'],
      },
      name: {
        type: String,
        required: [true, 'A transaction must have a customer name'],
      },
    },
    description: {
      type: String,
      default: 'For purchasing bags',
    },
    id: {
      type: String,
      required: [true, 'A transaction must have an ID'],
    },
    order_id: {
      type: String,
      required: [true, 'A transaction must have an order ID'],
    },
    reference_id: {
      type: String,
      required: [true, 'A transaction must have a reference ID'],
    },
    short_url: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: [true, 'A transaction must have a status'],
    },
    user_id: {
      type: String,
      default: '',
    },
    razorpay_payment_id: {
      type: String,
      required: [true, 'A transaction must have a Razorpay payment ID'],
    },
    razorpay_payment_link_id: {
      type: String,
      required: [true, 'A transaction must have a Razorpay payment link ID'],
    },
    razorpay_payment_link_reference_id: {
      type: String,
      required: [
        true,
        'A transaction must have a Razorpay payment link reference ID',
      ],
    },
    razorpay_payment_link_status: {
      type: String,
      required: [
        true,
        'A transaction must have a Razorpay payment link status',
      ],
    },
    razorpay_signature: {
      type: String,
      required: [true, 'A transaction must have a Razorpay signature'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
