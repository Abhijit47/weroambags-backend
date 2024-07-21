const mongoose = require('mongoose');

const contactUsSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide your first name.'],
      lowercase: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide your last name.'],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email.'],
      unique: true,
    },
    phoneNo: {
      type: String,
      required: [true, 'Please provide your phone number.'],
      unique: true,
    },
    message: {
      type: String,
      required: [true, 'Please provide your message.'],
      lowercase: true,
      trim: true,
      minLength: [10, 'Message must be at least 10 characters long.'],
      maxLength: [500, 'Message must not be more than 500 characters long.'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ContactUs = mongoose.model('ContactUs', contactUsSchema);

module.exports = ContactUs;
