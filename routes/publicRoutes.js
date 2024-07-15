const express = require('express');

const bagController = require('../controllers/bagController');

const router = express.Router();

router.route('/bags').get(bagController.getAccessBagsImages);

module.exports = router;
