const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: Array,
      required: [true, 'Please provide a sub-category name'],
      trim: true,
      default: [],
    },
    bags: [
      {
        type: ObjectId,
        ref: 'Bag',
        // required: [true, 'Please provide a bag id'],
      },
    ],
    category: {
      type: ObjectId,
      ref: 'Category',
      // required: [true, 'Please provide a category id'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;
