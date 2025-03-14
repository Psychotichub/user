const express = require('express');
const router = express.Router();
const totalPriceController = require('../controllers/totalPriceController');
const { getTotalPrice, addTotalPrice, getTotalPriceByDate, getDateRange } = totalPriceController;

// Routes
router.get('/', getTotalPrice);  // Get all daily reports
router.post('/', addTotalPrice);  // Add new total price
router.get('/date/:date', getTotalPriceByDate);  // Get daily reports by date
router.get('/date-range', getDateRange);  // Check if date range exists

module.exports = router;
