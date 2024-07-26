const path = require('path');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const passport = require('passport');
const session = require('express-session');

// Initialize Passport
const initializePassport = require('./configs/passportConfig');
initializePassport(passport);

// Initialize Express App
const app = express();
app.enable('trust proxy');

// Enable CORS
app.use(cors());
app.options('*', cors());

// Global Middlewares
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data Compression middleware
app.use(compression());

// Passport middleware
app.use(
  session({
    secret: process.env.PASSPORT_LOCAL_SECRET,
    resave: false,
    saveUninitialized: true,
    // cookie: {
    //   secure: false,
    //   httpOnly: true,
    //   maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    // },
  })
);

// This is the basic express session({..}) initialization.
app.use(passport.initialize());
// init passport on every route call.
app.use(passport.session());
// allow passport to use "express-session".

// Development logging
if (process.env.NODE_ENV === 'dev ') {
  // console.log('env', process.env.NODE_ENV);
  // console.log('env stat', process.env.NODE_ENV === 'dev ');
  app.use(morgan('dev'));
}

// Routes
const bagRoutes = require('./routes/bagRoutes');
const blogRoutes = require('./routes/blogRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const userRoutes = require('./routes/userRoutes');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

// Home Route
app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Welcome to the we roam bags store' });
});

// API Routes
app.use('/api/v1/bag', bagRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/user', userRoutes);

// 404 Route
app.all('*', (req, res, next) => {
  return next(
    new AppError(
      `Can't ${req.method} request on this ${req.originalUrl}URL.`,
      404
    )
  );
});

// Global Error Handler
app.use(globalErrorHandler);

module.exports = { app };
