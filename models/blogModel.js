const moongose = require('mongoose');

const blogSchema = new moongose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      unique: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Blog = moongose.model('Blog', blogSchema);

module.exports = Blog;
