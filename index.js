require("dotenv").config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const midtransClient = require('midtrans-client'); // Import Library Resmi

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Konfigurasi Midtrans (Mode Sandbox)
let coreApi = new midtransClient.CoreApi({
    isProduction: false, 
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

app.post('/api/transaction', (req, res) => {
    const { userId, concertId, amount, methodId } = req.body;

    // 1. Siapkan Parameter Request sesuai Format Midtrans
    let parameter = {
        "payment_type": mapMethodToPaymentType(methodId),
        "transaction_details": {
            "order_id": "ORDER-" + new Date().getTime(), // Order ID harus unik
            "gross_amount": parseInt(amount) // Harus integer (tidak boleh koma)
        },
        "customer_details": {
            "first_name": "User",
            "last_name": userId,
            "email": "test@example.com", // Email wajib untuk beberapa metode
            "phone": "08111222333"
        }
    };

    // Tambahkan parameter spesifik sesuai Bank/Store
    if (methodId === "BCA" || methodId === "BRI" || methodId === "BNI") {
        parameter.bank_transfer = {
            "bank": methodId.toLowerCase() // bca, bri, atau bni
        };
    } else if (methodId === "INDOMARET") {
        parameter.cstore = {
            "store": "indomaret",
            "message": "Tiketons Payment"
        };
    } else if (methodId === "ALFAMART") {
        parameter.cstore = {
            "store": "alfamart",
            "message": "Tiketons Payment"
        };
    }

    // 2. Tembak ke Midtrans Core API
    coreApi.charge(parameter)
        .then((chargeResponse) => {
            console.log('Charge Response:', chargeResponse);

            // 3. Ambil Kode Bayar dari Response Midtrans
            let paymentCode = "";
            
            if (methodId === "INDOMARET" || methodId === "ALFAMART") {
                paymentCode = chargeResponse.payment_code; // Kode Toko Retail
            } else {
                // Untuk Bank Transfer, kode ada di array va_numbers
                if (chargeResponse.va_numbers && chargeResponse.va_numbers.length > 0) {
                    paymentCode = chargeResponse.va_numbers[0].va_number;
                } else if (chargeResponse.permata_va_number) {
                    paymentCode = chargeResponse.permata_va_number;
                }
            }

            // 4. Kirim Balik ke Android
            res.json({
                status: "SUCCESS",
                data: {
                    transaction_id: chargeResponse.transaction_id,
                    payment_code: paymentCode, // Ini kode ASLI dari Midtrans
                    amount: amount,
                    method: methodId
                }
            });
        })
        .catch((e) => {
            console.error('Error Midtrans:', e.message);
            res.status(500).json({
                status: "ERROR",
                message: e.message
            });
        });
});

// Helper Function: Mapping ID kita ke Tipe Midtrans
function mapMethodToPaymentType(methodId) {
    if (["BCA", "BRI", "BNI"].includes(methodId)) {
        return "bank_transfer";
    } else if (["INDOMARET", "ALFAMART"].includes(methodId)) {
        return "cstore";
    }
    return "bank_transfer"; // Default
}

app.listen(port, () => {
    console.log(`Server Backend berjalan di http://localhost:${port}`);
    console.log("SERVER KEY:", process.env.MIDTRANS_SERVER_KEY);
    console.log("CLIENT KEY:", process.env.MIDTRANS_CLIENT_KEY);
});