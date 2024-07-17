const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

const contentsSchema = new mongoose.Schema(
  {
    blogId: {
      type: ObjectId,
      ref: 'Blog',
      required: [true, 'Blog id is required'],
    },
    title: {
      type: String,
      // required: [true, 'Content title is required'],
    },
    description: {
      type: String,
      // required: [true, 'Content description is required'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Contents = mongoose.model('Content', contentsSchema);

module.exports = Contents;
