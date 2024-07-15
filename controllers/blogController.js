const Blog = require('../models/blogModel');

exports.createBlog = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: 'Please provide all the details' });
    }

    const blog = await Blog.create({ title, content });

    return res.status(201).json({ blog });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find();

    return res.status(200).json({ blogs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById({ _id: id });

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    return res.status(200).json({ blog });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: 'Please provide all the details' });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      {
        _id: id,
      },
      {
        $set: { title, content },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    return res.status(200).json({ updatedBlog });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedBlog = await Blog.findByIdAndDelete({ _id: id });

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
