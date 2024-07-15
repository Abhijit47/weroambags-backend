const mongoose = require('mongoose');
const { categories, subCategories } = require('./enums');

/*
"title": "default"
"oldPrice": "50"
"rating": "4.2"
"newPrice": "45"
"available":"100"
"sold": "50"
"missing" thumbnail
"category": "Backpack"
"subCategory": "Daypack"
"quantity": "1"
"reviewsCount": "20"
"description": "Etiam cursus scelerisque massa, ac facilisis sapien pharetra eu. Duis sollicitudin massa a felis elementum elementum vel vel quam. Nullam convallis auctor condimentum. Pellentesque blandit ex sit amet tellus rhoncus sollicitudin. Quisque scelerisque quis lorem a ullamcorper. Donec quis porta magna. Mauris molestie erat est ac accumsan."
"specifications": "Capacity 17litres Closure Type Zip Product Name Storm Color Black Height 17cm Length 10.75cm Material Type Polyester No of Compartments 1 No of pockets 1 Size Medium Strap Type Adjustable Width 5.75cm Capacity 17litres Closure Type Zip Product Name Storm Color Black Height 17cm Length 10.75cm Material Type Polyester No of Compartments 1 No of pockets 1 Size Medium Strap Type Adjustable Width 5.75cm"
*/

const bagSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      lowercase: true,
      min: [3, 'Title must be at least 3 characters'],
      max: [50, 'Title must be at most 50 characters'],
    },
    oldPrice: {
      type: String,
      required: [true, 'Please provide an old price'],
      min: [1, 'Old price must be at least 1 character'],
    },
    rating: {
      type: String,
      required: [true, 'Please provide a rating'],
      // min: [1, 'Rating must be at least 1 character'],
    },
    newPrice: {
      type: String,
      required: [true, 'Please provide a new price'],
      min: [1, 'New price must be at least 1 character'],
    },
    available: {
      type: String,
      required: [true, 'Please provide an available quantity'],
      // min: [1, 'Available quantity must be at least 1 character'],
    },
    sold: {
      type: String,
      required: [true, 'Please provide a sold quantity'],
      // min: [1, 'Sold quantity must be at least 1 character'],
    },
    thumbnail: {
      type: Array,
      required: [true, 'Please provide a thumbnail'],
    },
    category: {
      type: String,
      enum: {
        values: categories,
        message: '{VALUE} invalid category',
      },
    },
    subCategory: {
      type: String,
      enum: {
        values: subCategories,
        message: '{VALUE} invalid sub-category',
      },
    },
    quantity: {
      type: String,
      required: [true, 'Please provide a quantity'],
      min: [1, 'Quantity must be at least 1 character'],
    },
    reviewsCount: {
      type: String,
      required: [true, 'Please provide a reviews count'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
      lowercase: true,
    },
    specifications: {
      type: String,
      required: [true, 'Please provide a specification'],
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Bag = mongoose.model('bag', bagSchema);

module.exports = Bag;
