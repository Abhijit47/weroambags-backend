const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.register = catchAsync(async (req, res, next) => {
  // console.log('user', req.user);
  const { name, email, password, phone } = req.body;

  // console.log('name', name);
  // console.log('email', email);
  // console.log('password', password);
  // console.log('phone', phone);

  const existingUser = await User.findOne({ email: email });

  if (existingUser) {
    return next(new AppError('User already exists try to login', 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
  });

  if (!user) {
    return next(new AppError('Something went wrong', 500));
  }

  const token = user.getSignedToken();

  return res.status(200).json({ message: 'Registration successful' });
});

exports.login = catchAsync(async (req, res, next) => {
  // console.log('reqController', req.body); // same as req.body
  // console.log('res', req.user); // same as req.user

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  const token = user.getSignedToken();

  res.cookie('token', token, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
  });

  return res.status(200).json({ message: 'Login successful', token });
});

exports.SignInWithGoogle = catchAsync(async (req, res, next) => {
  // console.log('reqController', req);
  // console.log('reqController', req.body);
  // console.log('res', req.user);

  // check if user exists
  const user = await User.findOne({ googleId: req.user.id });

  if (user) {
    // generate token
    const token = user.getSignedToken();

    if (process.env.NODE_ENV === 'dev ') {
      res.cookie('token_google', token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: false,
      });
      return res.redirect('http://localhost:5173');
    }

    res.cookie('token_google', token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
    });

    return res.redirect('https://weroambags.vercel.app/');
    // return res.status(200).json({ message: 'Login successful google', token });
  }

  const newUser = await User.create({
    email: req.user.emails[0].value,
    googleId: req.user.id,
    displayName: req.user.displayName,
    givenName: req.user.name.givenName,
    familyName: req.user.name.familyName,
    photo: req.user.photos[0].value,
  });

  // generate token
  const token = newUser.getSignedToken();

  if (process.env.NODE_ENV === 'dev ') {
    res.cookie('token_google', token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: false,
    });
    return res.redirect('http://localhost:5173');
  }

  res.cookie('token_google', token, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
  });

  return res.redirect('https://weroambags.vercel.app/');
  // return res.status(201).json({ message: 'Login successful google', token });
});

exports.SignInWithFacebook = catchAsync(async (req, res, next) => {
  // console.log('reqController', req);
  // console.log('reqController', req.body);
  // console.log('user details', req.user);
  // console.log('session', req.session); // obj cookie, passport
  // console.log('session', req.isAuthenticated()); //

  // console.log(req.user);

  // check if user exists
  const user = await User.findOne({ facebookId: req.user.id });

  if (user) {
    // generate token
    const token = user.getSignedToken();

    if (process.env.NODE_ENV === 'dev ') {
      res.cookie('token_facebook', token, {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: false,
      });
      return res.redirect('http://localhost:5173');
    }

    res.cookie('token_facebook', token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
    });

    return res.redirect('https://weroambags.vercel.app/');

    // return res
    //   .status(200)
    //   .json({ message: 'Login successful with facebook', token });
  }

  const newUser = await User.create({
    facebookId: req.user.id,
    displayName: req.user.displayName,
  });

  // generate token
  const token = newUser.getSignedToken();

  if (process.env.NODE_ENV === 'dev ') {
    res.cookie('token_facebook', token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: false,
    });
    return res.redirect('http://localhost:5173');
  }

  res.cookie('token_facebook', token, {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
  });

  return res.redirect('https://weroambags.vercel.app/');

  // return res
  //   .status(201)
  //   .json({ message: 'Login successful with facebook', token });
});

// Signed in user only
exports.getMe = catchAsync(async (req, res, next) => {
  // console.log('req', req.body);
  // console.log('res', res);

  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const user = await User.findOne(
    {
      _id: req.user.id,
    },
    { password: 0 },
    { lean: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  return res.status(200).json({ message: 'Get me successful', user });
});

// Admin only
exports.getUsers = catchAsync(async (req, res, next) => {
  // console.log('req', req.body);
  // console.log('res', res);

  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  if (req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to perform this action', 403)
    );
  }

  const users = await User.find({}, { password: 0 }, { lean: true });

  return res.status(200).json({ message: 'Get all users successful', users });
});

// Admin only
exports.updateUser = catchAsync(async (req, res, next) => {
  // console.log('req', req.body);
  // console.log('res', res);

  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  return res.status(200).json({ message: 'Update user successful', user });
});

// Admin only
exports.deleteUser = catchAsync(async (req, res, next) => {
  // console.log('req', req.body);
  // console.log('res', res);

  if (!req.user) {
    return next(new AppError('You are not logged in', 401));
  }

  const user = await User.findByIdAndDelete(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  return res.status(204).json({ message: 'Delete user successful' });
});
