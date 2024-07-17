const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const multer = require('multer');

const Blog = require('../models/blogModel');
const Contents = require('../models/contentsModel');
const { randomId } = require('../utils/helpers');

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

exports.createBlog = async (req, res, next) => {
  try {
    const { title, contents } = req.body;

    console.log(title, JSON.parse(contents));
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

    let id = randomId();
    const fileName =
      req.file.originalname
        .toLowerCase()
        .replaceAll(' ', '-')
        .replace(/\s/g, '-')
        .split('.')[0] +
      '-' +
      id +
      '.' +
      req.file.originalname.split('.')[1];

    await writeFile(join(dir, fileName), req.file.buffer);

    const serverUrl = `https://weroambags-backend.onrender.com`;

    const blogCover = `${serverUrl}/blogs/${fileName}`;

    const newblog = await Blog.create({
      title,
      cover: blogCover,
    });

    /*
    [
  { title: 'title2', description: 'desc 1' },
  { title: 'title2', description: 'desc 2' },
  { title: 'title3', description: 'desc3' }
]
    */

    const newContents = await Contents.insertMany(
      JSON.parse(contents).map((content) => ({
        blogId: newblog._id,
        title: content.title,
        description: content.description,
      }))
    );

    // Update the blog with the contents
    const update = await Blog.findOneAndUpdate(
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
    console.log('update', update);

    // Reset the id
    id = '';

    return res.status(201).json({ newblog });
  } catch (error) {
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

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

    const deletedBlog = await Blog.findByIdAndDelete(
      { _id: id },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Successfully deleted the blog post',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;

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
