const multer = require('multer');

// 1. Upload to buffer
// store the image in memoryStorage in buffer and
// sharp libary wiil now catch it from memory storage
// and transform the image and save it to disk.
const multerStorage = multer.memoryStorage();

// create a multer filter for check certain file is upload or not
// upload a photo only '.jpeg','.png','.jpg'
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

module.exports = upload;
