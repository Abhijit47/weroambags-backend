const express = require('express');

const authMiddleware = require('../middlewares/authMiddleware');
const blogController = require('../controllers/blogController');

const router = express.Router();

router.get('/get-blogs', blogController.getBlogs);

router.get(
  '/get-blog/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo(['admin', 'user']),
  blogController.getBlog
);

router.get(
  '/get-contents',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  blogController.getContents
);

router.post(
  '/create-blog',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  blogController.uploadBlogImage,
  blogController.uploadToServer,
  blogController.uploadToCloud,
  blogController.createBlog
);

router.patch(
  '/update-blog/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  blogController.uploadBlogImage,
  blogController.updateBlog
);

router.delete(
  '/delete-blog/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  blogController.deleteBlog
);

router.delete(
  '/delete-content/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  blogController.deleteContent
);

module.exports = router;
