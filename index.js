require("dotenv").config();

const express = require("express");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= ENV CHECK =================
if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
  console.error("❌ MIDTRANS SANDBOX KEY TIDAK LENGKAP");
}

// ================= MIDTRANS SANDBOX CONFIG =================
const coreApi = new midtransClient.CoreApi({
  isProduction: false, // 🔴 WAJIB FALSE (SANDBOX)
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ================= API =================
app.post("/api/transaction", async (req, res) => {
  try {
    const { userId, concertId, amount, methodId } = req.body;

    if (!amount || !methodId) {
      return res.status(400).json({
        status: "ERROR",
        message: "amount & methodId wajib"
      });
    }

    const parameter = {
      payment_type: mapMethodToPaymentType(methodId),
      transaction_details: {
        order_id: "ORDER-" + Date.now(),
        gross_amount: parseInt(amount)
      },
      customer_details: {
        first_name: "User",
        last_name: userId || "-",
        email: "test@example.com",
        phone: "08111222333"
      }
    };

    if (["BCA", "BRI", "BNI"].includes(methodId)) {
      parameter.bank_transfer = {
        bank: methodId.toLowerCase()
      };
    }

    if (["INDOMARET", "ALFAMART"].includes(methodId)) {
      parameter.cstore = {
        store: methodId.toLowerCase(),
        message: "Tiketons Payment"
      };
    }

    const chargeResponse = await coreApi.charge(parameter);

    let paymentCode = "";

    if (["INDOMARET", "ALFAMART"].includes(methodId)) {
      paymentCode = chargeResponse.payment_code;
    } else if (chargeResponse.va_numbers?.length) {
      paymentCode = chargeResponse.va_numbers[0].va_number;
    } else if (chargeResponse.permata_va_number) {
      paymentCode = chargeResponse.permata_va_number;
    }

    res.json({
      status: "SUCCESS",
      data: {
        transaction_id: chargeResponse.transaction_id,
        payment_code: paymentCode,
        amount,
        method: methodId
      }
    });

  } catch (error) {
    console.error("❌ Midtrans Sandbox Error:", error.message);
    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

// ================= HELPER =================
function mapMethodToPaymentType(methodId) {
  if (["BCA", "BRI", "BNI"].includes(methodId)) return "bank_transfer";
  if (["INDOMARET", "ALFAMART"].includes(methodId)) return "cstore";
  return "bank_transfer";
}

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 SANDBOX Backend running on port ${PORT}`);
});
