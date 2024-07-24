const { writeFile } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const crypto = require('crypto');

const { allowedKeys } = require('../models/enums');

function filteredBody(reqBody) {
  // filter the body
  // check if the keys in the body are allowed
  const bool = Object.keys(reqBody).every((key) => allowedKeys.includes(key));
  if (!bool) {
    return false;
  }
  return true;
}

function checkBodyRequest(reqBody) {
  const keys = Object.keys(reqBody);

  const missingKeys = allowedKeys.filter((key) => !keys.includes(key));

  if (missingKeys.length <= 0) {
    return true;
  }
  return false;
}

function randomId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function fileNameInKebabCase(name) {
  const id = randomId();

  return (
    name.toLowerCase().replaceAll(' ', '-').replace(/\s/g, '-').split('.')[0] +
    '-' +
    id +
    '.' +
    name.split('.')[1]
  );
}

function isStringifiedJSON(data) {
  // Check if data is a string
  if (typeof data === 'string') {
    try {
      // Attempt to parse it as JSON
      JSON.parse(data);
      // If parsing succeeds, it's stringified JSON
      return true;
    } catch (e) {
      // If parsing fails, it's a regular string
      return false;
    }
  }
  // If data is not a string, it's not stringified JSON
  return false;
}

function getFutureTimestamp(minutes) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60000);
  return futureTime.getTime();
}

function generateSignature(order_id, razorpay_payment_id, secret) {
  // Concatenate order_id and razorpay_payment_id with a pipe separator
  const data = `${order_id}|${razorpay_payment_id}`;

  // Use crypto.createHmac to generate the HMAC SHA256 signature
  const generated_signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return generated_signature;
}

function successResponse(res, statusCode, status, message, data) {
  return res.status(statusCode).json({ status, message, data });
}

function errorResponse(res, statusCode, status, message, error) {
  return res.status(statusCode).json({ status, message, error });
}

function purgeCache(cacheName) {
  const keys = cacheName.keys();
  if (keys.length > 0) {
    cacheName.flushAll();
    cacheName.flushStats();
  }
}

function uploadMultipleImagesToServer(files, directoryName) {
  try {
    // Generate a random id
    let id = randomId();

    // Generate the file names
    const fileNames = files.map(
      (file) =>
        file.originalname
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/\s/g, '-')
          .split('.')[0] +
        '-' +
        id +
        '.' +
        file.originalname.split('.')[1]
    );

    // Each file is uploaded to the public folder in the server specified directory
    files.forEach(async (file) => {
      const fileName =
        file.originalname
          .toLowerCase()
          .replaceAll(' ', '-')
          .replace(/\s/g, '-')
          .split('.')[0] +
        '-' +
        id +
        '.' +
        file.originalname.split('.')[1];

      const folderName = join(__dirname, '..', 'public', directoryName);

      // check if the folder exists
      if (!existsSync(folderName)) {
        mkdirSync(folderName);
      }

      // Store it in the public folder in the server
      await writeFile(join(folderName, fileName), file.buffer);
    });

    // reset the id
    id = '';

    // return the file names
    return fileNames;
  } catch (error) {
    console.error(error.name);
    console.error(error.message);
    console.error(error.stack);

    return false;
  }
}

module.exports = {
  filteredBody,
  checkBodyRequest,
  randomId,
  fileNameInKebabCase,
  isStringifiedJSON,
  getFutureTimestamp,
  generateSignature,
  successResponse,
  errorResponse,
  purgeCache,
  uploadMultipleImagesToServer,
};
