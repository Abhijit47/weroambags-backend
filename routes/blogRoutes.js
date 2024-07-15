const express = require('express');

const blogController = require('../controllers/blogController');

const router = express.Router();

router.get('/get-blogs', blogController.getBlogs);

router.get('/get-blog/:id', blogController.getBlog);

router.post('/create-blog', blogController.createBlog);

router.patch('/update-blog/:id', blogController.updateBlog);

router.delete('/delete-blog/:id', blogController.deleteBlog);

module.exports = router;
