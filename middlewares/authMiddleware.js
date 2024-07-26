const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.protect = catchAsync(async (req, res, next) => {
  // 1. check token is available on req.header or not
  if (req.headers.authorization === undefined) {
    return next(new AppError('Forbidden access!!!', 403));
  }

  // 2. check token is available on req.header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    const token = req.headers.authorization.split(' ')[1];

    // 2.1 Decode the token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

    const { id, exp } = decoded;

    // 2.2 check the token is expire or not
    const currentTime = Math.round(new Date() / 1000);

    if (currentTime <= exp) {
      // find this user with decoded id
      const user = await User.findById({ _id: id }).select(
        '-password -updatedAt'
      );

      // Send to next request
      req.user = user;

      next();
    } else {
      return next(new AppError('Invalid token', 500));
    }
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    console.log('restriction passed');
    next();
  };
};
