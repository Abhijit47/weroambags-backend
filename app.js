const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const bagRoutes = require('./routes/bagRoutes');
const publicRoutes = require('./routes/publicRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Welcome to the we roam bags store' });
});

app.use('/api/v1/bag', bagRoutes);
app.use('/public', publicRoutes);

app.all('*', (req, res) => {
  return res.status(404).json({
    message: `Can't find ${req.method} ${req.originalUrl} on this server!`,
  });
});

module.exports = app;
