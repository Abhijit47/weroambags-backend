const { writeFile, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const NodeCache = require('node-cache');

const Blog = require('../models/blogModel');
const Contents = require('../models/contentsModel');

const uploader = require('../configs/cloudinary');
const upload = require('../configs/multerConfig');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const {
  fileNameInKebabCase,
  successResponse,
  purgeCache,
} = require('../utils/helpers');

// Initialize the cache
const blogCache = new NodeCache({ stdTTL: 60 * 60 });

exports.uploadBlogImage = upload.single('cover');

exports.uploadToServer = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a blog cover', 400));
  }

  const dir = join(__dirname, '..', 'public', 'blogs');

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const fileName = fileNameInKebabCase(req.file.originalname);

  await writeFile(join(dir, fileName), req.file.buffer);

  req.fileName = fileName;

  // call the next middleware
  next();
});

exports.uploadToCloud = catchAsync(async (req, res, next) => {
  // console.log('upload to cloud');
  // console.log(req.fileName);

  // Cloudinary folder name
  const cloudinaryFolder = 'blogs';

  const folderName = join(__dirname, '..', 'public', 'blogs');

  //Get the file path
  const filePath = join(folderName, req.fileName);

  // console.log(filePath);

  //Upload the file to cloudinary
  const result = await uploader.upload(filePath, {
    folder: cloudinaryFolder,
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    invalidate: true,
  });

  // console.log('result', result);

  // Delete the file from the server
  unlink(filePath, function (err) {
    if (err) {
      console.error(err);
    }
    console.log('Blog cover deleted from the server');
  });

  // Set the cloudinary url to the req object
  req.cloudinaryResponse = result;

  // call the next middleware
  next();
});

// CREATE BLOG
exports.createBlog = catchAsync(async (req, res, next) => {
  const { title, contents } = req.body;
  // console.log(title, JSON.parse(contents));
  // console.log(req.file);

  if (!title || !contents) {
    return next(new AppError('Please provide all the details', 400));
  }

  if (!req.cloudinaryResponse) {
    return next(new AppError('Please upload a blog cover', 400));
  }

  const newblog = await Blog.create({
    title,
    cover: req.cloudinaryResponse.secure_url,
    assetId: req.cloudinaryResponse.asset_id,
    publicId: req.cloudinaryResponse.public_id,
    secretUrl: req.cloudinaryResponse.secure_url,
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

  if (!newblog || !newContents || !updateBlogWithContents) {
    return next(new AppError('Something went wrong in create blog', 404));
  }

  // Clear the cache if it exists
  purgeCache(blogCache);

  return res.status(201).json({
    status: 'success',
    message: 'Successfully created blog post.',
    data: updateBlogWithContents._id,
  });
});

// GET BLOGS
exports.getBlogs = catchAsync(async (req, res, next) => {
  const keys = blogCache.keys();
  // console.log('key', keys);

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
        .select('-updatedAt -assetId -publicId -secretUrl')
        .skip(skip)
        .limit(limit)
        .populate('contents', 'title description')
        .exec();

      if (blogs.length <= 0) {
        return next(new AppError('No Blogs found', 404));
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
      .sort({ createdAt: -1 })
      .select('-updatedAt -assetId -publicId -secretUrl')
      .skip(skip)
      .limit(limit)
      .populate('contents', 'title description')
      .exec();

    if (!blogs) {
      return next(new AppError('No Blogs found', 404));
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
});

// GET BLOG
exports.getBlog = catchAsync(async (req, res, next) => {
  const keys = blogCache.keys();
  // console.log('key', keys);

  const { id } = req.params;
  if (!id || id.length !== 24) {
    return next(new AppError('Please provide a valid id.', 400));
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
      .select('-updatedAt -assetId -publicId -secretUrl')
      .populate('contents', 'title description')
      .exec();

    if (!blog) {
      return next(new AppError('No Blog found', 404));
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
});

// UPDATE BLOG
exports.updateBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { title, contents } = req.body;

  // If there no id or is less than 24 characters
  if (!id || id.length !== 24) {
    return next(new AppError('Please provide a valid id.', 400));
  }

  // If there is no title or content
  if (!title) {
    return next(new AppError('Please provide a title or content', 400));
  }

  // find the existing blog
  const existingBlog = await Blog.findById({ _id: id }).lean();
  if (!existingBlog) {
    return next(new AppError('No Blog found for update', 404));
  }

  // if there is new cover image
  if (req.file) {
    // delete the existing blog cover
    const existingCover = existingBlog.publicId;
    uploader.destroy(existingCover, function (error, result) {
      if (error) {
        console.error(error);
      }
      console.log('DELETE', result);
      console.log(`Deleted the existing blog cover from cloudinary`);
    });

    const dir = join(__dirname, '..', 'public', 'blogs');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const fileName = fileNameInKebabCase(req.file.originalname);

    await writeFile(join(dir, fileName), req.file.buffer);

    //Get the file path
    const filePath = join(dir, fileName);

    const result = await uploader.upload(filePath, {
      folder: 'blogs',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      invalidate: true,
    });

    // Set the cloudinary url to the req object
    req.cloudinaryResponse = result;

    // Delete the file from the server
    unlink(join(dir, fileName), function (err) {
      if (err) {
        console.error(err);
      }
      console.log('Blog cover deleted from the server');
    });
  }

  // update the blog
  const updateObj = {
    title: title ? title : existingBlog.title,
    cover: req.cloudinaryResponse
      ? req.cloudinaryResponse.secure_url
      : existingBlog.secretUrl,
    assetId: req.cloudinaryResponse
      ? req.cloudinaryResponse.asset_id
      : existingBlog.assetId,
    publicId: req.cloudinaryResponse
      ? req.cloudinaryResponse.public_id
      : existingBlog.publicId,
    secretUrl: req.cloudinaryResponse
      ? req.cloudinaryResponse.secure_url
      : existingBlog.secretUrl,
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

  // console.log('updated blog', updatedBlog);

  if (!updatedBlog) {
    return next(new AppError('Something went wrong in update blog', 404));
  }

  // update the contents
  if (contents) {
    const parsedContents = JSON.parse(contents);

    const contentPromises = parsedContents.map(async (content) => {
      const newContent = await Contents.create({
        blogId: id,
        title: content.title,
        description: content.description,
      });

      return newContent;
    });

    const newContents = await Promise.all(contentPromises);
    // console.log('new contents', newContents);

    if (!newContents) {
      return next(new AppError('Something went wrong in update contents', 404));
    }

    // Update the blog with the contents
    const contentIds = newContents.map((content) => content._id);

    const updatedBlogWithContents = await Blog.findOneAndUpdate(
      {
        _id: id,
      },
      {
        contents: contentIds,
      },
      { new: true, runValidators: true }
    );

    if (!updatedBlogWithContents) {
      return next(new AppError('Something went wrong in update blog', 404));
    }
  }

  // check if the cache has the data
  purgeCache(blogCache);

  return successResponse(res, 200, 'success', 'Successfully updated blog');
});

// DELETE BLOG
exports.deleteBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id || id <= 24) {
    return next(new AppError('Please provide a valid id.', 400));
  }

  // find the existing blog
  const blog = await Blog.findById({ _id: id }).lean();

  if (!blog) {
    return next(new AppError('No Blog found for delete', 404));
  }

  // delete the blog cover from cloudinary
  uploader.destroy(blog.publicId, function (error, result) {
    if (error) {
      console.error(error);
    }
    console.log('DELETE', result);
    console.log(`Deleted the blog cover from cloudinary
      `);
  });

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
    return next(new AppError('Something went wrong in delete blog', 404));
  }

  // check if the cache has the data
  purgeCache(blogCache);

  return successResponse(
    res,
    200,
    'success',
    'Successfully deleted the blog post and its contents',
    deletedBlog._id
  );
});

// GET CONTENTS
exports.getContents = catchAsync(async (req, res, next) => {
  const contents = await Contents.find({}).lean().exec();

  if (!contents) {
    return next(new AppError('No contents found', 404));
  }

  return successResponse(
    res,
    200,
    'success',
    'Successfully retrieved contents',
    contents
  );
});

// DELETE CONTENT
exports.deleteContent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!id || id <= 24) {
    return next(new AppError('Please provide a valid id.', 400));
  }

  const deletedContent = await Contents.findByIdAndDelete(
    { _id: id },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!deletedContent) {
    return next(new AppError('Something went wrong in delete content', 404));
  }

  return successResponse(
    res,
    200,
    'success',
    'Successfully deleted the content'
  );
});
