const express = require('express');

const blogController = require('../controllers/blogController');

const router = express.Router();

router.get('/get-blogs', blogController.getBlogs);

router.get('/get-blog/:id', blogController.getBlog);

router.get('/get-contents', blogController.getContents);

router.post(
  '/create-blog',
  blogController.uploadBlogImage,
  blogController.createBlog
);

router.patch(
  '/update-blog/:id',
  blogController.uploadBlogImage,
  blogController.updateBlog
);

router.delete('/delete-blog/:id', blogController.deleteBlog);

router.delete('/delete-content/:id', blogController.deleteContent);

module.exports = router;
