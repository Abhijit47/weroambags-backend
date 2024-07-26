const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // required: true,
      default: '',
    },
    email: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
      // required: true,
      default: '',
    },
    password: {
      type: String,
      default: '',
      // required: true,
    },
    googleId: {
      type: String,
      default: '',
    },
    facebookId: {
      type: String,
      default: '',
    },
    displayName: {
      type: String,
      default: '',
    },
    givenName: {
      type: String,
      default: '',
    },
    familyName: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN, {
    expiresIn: process.env.EXPIRES_IN,
  });
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
