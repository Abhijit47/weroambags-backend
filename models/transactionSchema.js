const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
