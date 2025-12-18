// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Dipanggil Android
router.post('/token', paymentController.createTransaction);

// Dipanggil Midtrans Server (Webhook)
router.post('/notification', paymentController.handleNotification);

module.exports = router;