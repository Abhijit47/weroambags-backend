const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const multer = require('multer');

const Blog = require('../models/blogModel');
const Contents = require('../models/contentsModel');
const { randomId, fileNameInKebabCase } = require('../utils/helpers');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadBlogImage = upload.single('cover');

// CREATE BLOG
exports.createBlog = async (req, res, next) => {
  try {
    const { title, contents } = req.body;

    // console.log(title, JSON.parse(contents));
    // console.log(req.file);

    if (!title || !contents) {
      return res
        .status(400)
        .json({ message: 'Please provide all the details' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a blog cover' });
    }

    const dir = join(__dirname, '..', 'public', 'blogs');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // let id = randomId();
    const fileName = fileNameInKebabCase(req.file.originalname);

    await writeFile(join(dir, fileName), req.file.buffer);

    const serverUrl = `https://weroambags-backend.onrender.com`;

    const blogCover = `${serverUrl}/blogs/${fileName}`;

    const newblog = await Blog.create({
      title,
      cover: blogCover,
    });

    const newContents = await Contents.insertMany(
      JSON.parse(contents).map((content) => ({
        blogId: newblog._id,
        title: content.title,
        description: content.description,
      }))
    );

    // Update the blog with the contents
    const updateBlogWithContents = await Blog.findOneAndUpdate(
      {
        _id: newblog._id,
      },
      {
        $push: { contents: newContents.map((content) => content._id) },
      },
      {
        new: true,
        // runValidators: true,
      }
    );
    // console.log('update', updateBlogWithContents);

    // Reset the id
    // id = '';

    return res.status(201).json({
      status: 'success',
      message: 'Successfully created blog post.',
      data: updateBlogWithContents,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET BLOGS
exports.getBlogs = async (req, res, next) => {
  try {
    const blogs = await Blog.find({})
      .lean()
      .select('-updatedAt')
      .populate('contents', 'title description')
      .exec();

    if (!blogs) {
      return res.status(404).json({ message: 'success', blogs });
    }

    return res.status(200).json({ blogs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET BLOG
exports.getBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id <= 24) {
      return res.status(400).json({ message: 'Please provide a valid id.' });
    }

    const blog = await Blog.findById({ _id: id })
      .lean()
      .select('-updatedAt')
      .populate('contents', 'title description')
      .exec();

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    return res.status(200).json({ status: 'success', blog });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// UPDATE BLOG
exports.updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    // const { cover } = req.file;

    const serverUrl = `https://weroambags-backend.onrender.com`;
    let fileName = undefined;

    // If there no id or is less than 24 characters
    if (!id || id <= 24) {
      return res.status(400).json({ message: 'Please provide a valid id.' });
    }

    // If there is no title or content
    if (!title) {
      return res.status(400).json({ message: 'Please provide the title.' });
    }

    // find the existing blog
    const existingBlog = await Blog.findById({ _id: id }).lean();
    if (!existingBlog) {
      return res.status(404).json({ message: 'No Blog found for update.' });
    }

    // if there is a new cover image
    if (req.file) {
      // delete the existing blog cover
      const existingCover = existingBlog.cover.split('/').pop();
      const filePath = join(__dirname, '..', 'public', 'blogs', existingCover);

      // find the existing blog cover
      if (existsSync(filePath)) {
        await unlink(filePath);
      }

      const dir = join(__dirname, '..', 'public', 'blogs');
      fileName = fileNameInKebabCase(req.file.originalname);

      await writeFile(join(dir, fileName), req.file.buffer);
    }

    const updateObj = {
      title: title || existingBlog.title,
      cover: fileName ? `${serverUrl}/blogs/${fileName}` : existingBlog.cover,
    };

    const updatedBlog = await Blog.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: updateObj,
      },
      {
        new: true,
        // runValidators: true,
      }
    );

    if (!updatedBlog) {
      return res.status(400).json({ message: 'Something went wrong' });
    }

    // Reset the fileName
    fileName = undefined;

    return res
      .status(200)
      .json({ status: 'Successfully updated blog.', updatedBlog });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE BLOG
exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id <= 24) {
      return res.status(400).json({ message: 'Please provide a valid id.' });
    }

    // find the existing blog
    const blog = await Blog.findById({ _id: id }).lean();

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found for delete.' });
    }

    // delete the blog cover
    const cover = blog.cover.split('/').pop();
    const dir = join(__dirname, '..', 'public', 'blogs', cover);

    if (existsSync(dir)) {
      await unlink(dir);
    }

    const deletedBlog = await Blog.findByIdAndDelete(
      { _id: id },
      {
        new: true,
        runValidators: true,
      }
    );

    // delete the contents
    const deletedContents = await Contents.deleteMany({ blogId: id });

    if (!deletedBlog || !deletedContents) {
      return res.status(404).json({ message: 'Something went wrong' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Successfully deleted the blog post and its contents',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET CONTENTS
exports.getContents = async (req, res, next) => {
  try {
    const contents = await Contents.find({}).lean().exec();

    if (!contents) {
      return res.status(404).json({ message: 'success', contents });
    }

    return res.status(200).json({ contents });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE CONTENT
exports.deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id <= 24) {
      return res.status(400).json({ message: 'Please provide a valid id.' });
    }

    const deletedContent = await Contents.findByIdAndDelete(
      { _id: id },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedContent) {
      return res.status(404).json({ message: 'Content not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Successfully deleted the content',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
