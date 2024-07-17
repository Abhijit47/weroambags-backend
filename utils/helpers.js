const crypto = require('crypto');

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

module.exports = {
  randomId,
  fileNameInKebabCase,
  isStringifiedJSON,
  getFutureTimestamp,
  generateSignature,
};
