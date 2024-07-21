const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const NodeCache = require('node-cache');
const multer = require('multer');

const Blog = require('../models/blogModel');
const Contents = require('../models/contentsModel');

const {
  randomId,
  fileNameInKebabCase,
  successResponse,
  errorResponse,
} = require('../utils/helpers');

// Initialize the cache
const blogCache = new NodeCache({ stdTTL: 60 * 60 });

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

    // Clear the cache if it exists
    const cacheKey = blogCache.keys();
    if (cacheKey) {
      blogCache.flushAll();
      blogCache.flushStats();
      // blogCache.del('blogs');
    }

    return res.status(201).json({
      status: 'success',
      message: 'Successfully created blog post.',
      data: updateBlogWithContents,
    });
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};

// GET BLOGS
exports.getBlogs = async (req, res, next) => {
  const keys = blogCache.keys();
  // console.log('key', keys);
  try {
    const { page, search } = req.query;

    const pageNo = page || 1;

    // Check if the cache is empty
    const cacheKey = 'blogs';
    const countCacheKey = 'count';
    const cacheCount = blogCache.get(countCacheKey);
    const cacheValue = blogCache.get(cacheKey);
    const limit = 10;
    let totalBlogs = 0;
    const skip = pageNo === 1 ? 0 : (pageNo - 1) * limit;
    const totalPages = Math.ceil(totalBlogs / limit);
    const nextPage = pageNo < totalPages ? Number(pageNo) + 1 : null;
    const prevPage = pageNo > 1 ? pageNo - 1 : null;
    const currentPage = Number(pageNo);

    if (search) {
      const cacheKey = `search-${search}`;
      const cacheValue = blogCache.get(cacheKey);

      if (cacheValue) {
        return successResponse(
          res,
          200,
          'success',
          'Successfully retrieved blogs',
          {
            totalBlogs: cacheCount,
            totalPages,
            nextPage,
            prevPage,
            currentPage,
            blogs: cacheValue,
          }
        );
      } else {
        const blogs = await Blog.find({
          title: { $regex: search, $options: 'i' },
        })
          .sort({ createdAt: -1 })
          .lean()
          .select('-updatedAt')
          .skip(skip)
          .limit(limit)
          .populate('contents', 'title description')
          .exec();

        if (!blogs) {
          return errorResponse(res, 404, 'success', 'No blogs found');
        }

        totalBlogs = await Blog.countDocuments({
          title: { $regex: search, $options: 'i' },
        });

        // Set the cache
        blogCache.set(cacheKey, blogs, 3600);

        // Set the count cache
        blogCache.set(countCacheKey, totalBlogs, 3600);

        return successResponse(
          res,
          200,
          'success',
          'Successfully retrieved blogs',
          {
            totalBlogs,
            totalPages,
            nextPage,
            prevPage,
            currentPage,
            blogs,
          }
        );
      }
    }

    if (cacheValue) {
      return successResponse(
        res,
        200,
        'success',
        'Successfully retrieved blogs',
        {
          totalBlogs: cacheCount,
          totalPages,
          nextPage,
          prevPage,
          currentPage,
          blogs: cacheValue,
        }
      );
    } else {
      const blogs = await Blog.find()
        .lean()
        .select('-updatedAt')
        .skip(skip)
        .limit(limit)
        .populate('contents', 'title description')
        .exec();

      if (!blogs) {
        return errorResponse(res, 404, 'success', 'No blogs found');
      }

      totalBlogs = await Blog.countDocuments();

      // Set the cache
      blogCache.set(cacheKey, blogs, 3600);

      // Set the count cache
      blogCache.set(countCacheKey, totalBlogs, 3600);

      return successResponse(
        res,
        200,
        'success',
        'Successfully retrieved blogs',
        {
          totalBlogs,
          totalPages,
          nextPage,
          prevPage,
          currentPage,
          blogs,
        }
      );
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};

// GET BLOG
exports.getBlog = async (req, res, next) => {
  const keys = blogCache.keys();
  // console.log('key', keys);
  try {
    const { id } = req.params;
    if (!id || id <= 24) {
      return errorResponse(res, 400, 'fail', 'Please provide a valid id.', id);
    }

    const cacheKey = `blog-${id}`;
    const cacheValue = blogCache.get(cacheKey);

    if (cacheValue) {
      return successResponse(
        res,
        200,
        'success',
        'Successfully retrieved blog',
        cacheValue
      );
    } else {
      const blog = await Blog.findById({ _id: id })
        .lean()
        .select('-updatedAt')
        .populate('contents', 'title description')
        .exec();

      if (!blog) {
        return errorResponse(res, 404, 'fail', 'Blog not found');
      }

      // Set the cache
      blogCache.set(cacheKey, blog, 3600);

      return successResponse(
        res,
        200,
        'success',
        'Successfully retrieved blog',
        blog
      );
    }
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
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
      return errorResponse(res, 400, 'fail', 'Please provide a valid id.', id);
    }

    // If there is no title or content
    if (!title) {
      return errorResponse(res, 400, 'fail', 'Please provide the title.');
    }

    // find the existing blog
    const existingBlog = await Blog.findById({ _id: id }).lean();
    if (!existingBlog) {
      return errorResponse(res, 404, 'fail', 'No Blog found for update.');
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
      return errorResponse(res, 404, 'fail', 'Something went wrong');
    }

    // Reset the fileName
    fileName = undefined;

    // check if the cache has the data
    const cacheKey = `blog-${id}`;
    const cacheValue = blogCache.get(cacheKey);

    if (cacheValue) {
      blogCache.del(cacheKey);
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully updated blog',
      updatedBlog
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};

// DELETE BLOG
exports.deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id <= 24) {
      return errorResponse(res, 400, 'error', 'Please provide a valid id.', id);
    }

    // find the existing blog
    const blog = await Blog.findById({ _id: id }).lean();

    if (!blog) {
      return errorResponse(res, 404, 'error', 'Blog not found for delete.');
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

    // check if the cache has the data
    const cacheKey = `blog-${id}`;
    const cacheValue = blogCache.get(cacheKey);

    if (cacheValue) {
      blogCache.del(cacheKey);
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully deleted the blog post and its contents'
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};

// GET CONTENTS
exports.getContents = async (req, res, next) => {
  try {
    const contents = await Contents.find({}).lean().exec();

    if (!contents) {
      return errorResponse(res, 404, 'fail', 'No contents found', contents);
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully retrieved contents',
      contents
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};

// DELETE CONTENT
exports.deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id <= 24) {
      return errorResponse(res, 400, 'error', 'Please provide a valid id.', id);
    }

    const deletedContent = await Contents.findByIdAndDelete(
      { _id: id },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedContent) {
      return errorResponse(
        res,
        404,
        'fail',
        'Content not found',
        deletedContent
      );
    }

    return successResponse(
      res,
      200,
      'success',
      'Successfully deleted the content'
    );
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return errorResponse(res, 500, 'error', error.message, error);
  }
};
