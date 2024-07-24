const mongoose = require('mongoose');
const { app } = require('./app');

const MONGO_URI = process.env.DATABASE_URI;
const MONGO_PASSWORD = process.env.DATABASE_PASSWORD;
const DB = MONGO_URI.replace('<password>', MONGO_PASSWORD);
const PORT = process.env.PORT || 5000;

mongoose
  .connect(DB)
  .then(() => {
    console.log('DB connection successful');
  })
  .catch((err) => {
    console.log('DB connection failed');
    console.log(err.message);
  });

mongoose.set('strictPopulate', false);

app.listen(PORT, () => {
  console.log('app running on port:', PORT);
});
