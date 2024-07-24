const path = require('path');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

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

// Home Route
app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Welcome to the we roam bags store' });
});

// API Routes
app.use('/api/v1/bag', bagRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/order', orderRoutes);
app.use('/api/v1/contact', contactRoutes);

// 404 Route
app.all('*', (req, res) => {
  return res.status(404).json({
    message: `Can't find ${req.method} with ${req.originalUrl} on this server!`,
  });
});

module.exports = { app };
