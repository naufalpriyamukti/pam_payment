// src/index.js
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/paymentRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default Route
app.get('/', (req, res) => {
    res.send('Tiketons Backend is Running (Node.js + Supabase)');
});

// API Routes
app.use('/api/payment', paymentRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});