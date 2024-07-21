const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
    },
    bags: [
      {
        type: ObjectId,
        ref: 'Bag',
        // required: [true, 'Please provide a bag id'],
      },
    ],
    subCategories: {
      type: ObjectId,
      ref: 'SubCategory',
      // required: [true, 'Please provide a sub-category id'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
