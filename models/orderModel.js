const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'An order must have an order number'],
      unique: true,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    name: {
      type: String,
      required: [true, 'An order must have a user name'],
    },
    email: {
      type: String,
      required: [true, 'An order must have a user email'],
    },
    phone: {
      type: String,
      required: [true, 'An order must have a user phone number'],
    },
    orderItems: [
      {
        type: ObjectId,
        ref: 'Bag',
      },
    ],
    totalAmount: {
      type: String,
      required: [true, 'An order must have a total amount'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
