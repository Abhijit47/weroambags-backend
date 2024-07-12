const mongoose = require('mongoose');

const bagSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
    },
    oldPrice: {
      type: String,
      required: [true, 'Please provide an old price'],
    },
    rating: {
      type: String,
      required: [true, 'Please provide a rating'],
    },
    newPrice: {
      type: String,
      required: [true, 'Please provide a new price'],
    },
    available: {
      type: String,
      required: [true, 'Please provide an available quantity'],
    },
    sold: {
      type: String,
      required: [true, 'Please provide a sold quantity'],
    },
    thumbnail: {
      type: Array,
      required: [true, 'Please provide a thumbnail'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Bag = mongoose.model('bag', bagSchema);

module.exports = Bag;
