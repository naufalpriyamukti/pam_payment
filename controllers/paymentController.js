// src/controllers/paymentController.js
const { snap } = require('../config/midtrans');
const supabase = require('../config/supabase');

// 1. Membuat Token Transaksi (Dipanggil dari Android)
exports.createTransaction = async (req, res) => {
    try {
        const { orderId, totalAmount, customerDetails } = req.body;

        const parameter = {
            transaction_details: {
                order_id: orderId, // UUID dari Supabase
                gross_amount: totalAmount
            },
            customer_details: {
                first_name: customerDetails.name,
                email: customerDetails.email
            }
        };

        const transaction = await snap.createTransaction(parameter);
        
        // Simpan snap_token ke database Supabase agar sinkron
        const { error } = await supabase
            .from('transactions')
            .update({ snap_token: transaction.token })
            .eq('id', orderId);

        if (error) throw error;

        res.status(200).json({
            status: 'success',
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });

    } catch (error) {
        console.error("Error Create Transaction:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 2. Webhook Notification (Dipanggil oleh Midtrans Server)
// URL ini nanti dimasukkan ke Dashboard Midtrans
exports.handleNotification = async (req, res) => {
    try {
        const notification = req.body;
        
        const orderId = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;

        console.log(`Notifikasi masuk: Order ${orderId} status ${transactionStatus}`);

        let newStatus = 'PENDING';

        if (transactionStatus == 'capture') {
            if (fraudStatus == 'challenge') {
                newStatus = 'CHALLENGE';
            } else if (fraudStatus == 'accept') {
                newStatus = 'SUCCESS';
            }
        } else if (transactionStatus == 'settlement') {
            newStatus = 'SUCCESS';
        } else if (transactionStatus == 'cancel' ||
                   transactionStatus == 'deny' ||
                   transactionStatus == 'expire') {
            newStatus = 'FAILED';
        } else if (transactionStatus == 'pending') {
            newStatus = 'PENDING';
        }

        // Update status di Supabase
        const { error } = await supabase
            .from('transactions')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            console.error("Gagal update DB:", error);
            return res.status(500).send('Internal Server Error');
        }

        // Jika Sukses, kita juga bisa buat tiket di sini (Opsional)
        if (newStatus === 'SUCCESS') {
            // Logika generate tiket bisa ditaruh sini atau pakai Trigger SQL
        }

        res.status(200).send('OK'); // Midtrans butuh respon 200 OK

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Error');
    }
};