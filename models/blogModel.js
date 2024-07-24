const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      unique: true,
      trim: true,
    },
    cover: {
      type: String,
      required: [true, 'Blog cover image is required'],
    },
    contents: {
      type: [ObjectId],
      ref: 'Content',
    },
    assetId: {
      type: String,
      // required: [true, 'Asset ID is required'],
      default: '',
    },
    publicId: {
      type: String,
      // required: [true, 'Public ID is required'],
      default: '',
    },
    secretUrl: {
      type: String,
      // required: [true, 'Secret URL is required'],
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
