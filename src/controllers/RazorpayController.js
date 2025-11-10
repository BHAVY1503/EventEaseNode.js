const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentModel = require("../models/PaymentModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment order
const createOrder = async (req, res) => {
  try {
    const { amount, eventId } = req.body;
    
    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid amount" 
      });
    }

    const options = {
      amount: amount * 100, // Convert to paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        eventId: eventId,
        userId: req.user._id
      }
    };

    const order = await razorpay.orders.create(options);

    // Save order details
    await PaymentModel.create({
      orderId: order.id,
      userId: req.user._id,
      eventId: eventId,
      amount: amount,
      status: "pending"
    });

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Payment Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment order"
    });
  }
};

// Verify payment signature
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Update payment status
    await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      { 
        status: "completed",
        paymentId: razorpay_payment_id,
        updatedAt: Date.now()
      }
    );

    res.status(200).json({
      success: true,
      message: "Payment verified successfully"
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment"
    });
  }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await PaymentModel
      .find({ userId: req.user._id })
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("Payment History Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history"
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory
};



// const Razorpay = require("razorpay")
// const crypto = require("crypto");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // Create Razorpay Order
// const createOrder = async (req, res) => {
//   try {
//     const { amount, currency, receipt } = req.body;

//     const options = {
//       amount: amount * 100, // Razorpay needs amount in paise
//       currency: currency || "INR",
//       receipt: receipt || `receipt_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);
//     res.status(200).json(order);
//   } catch (error) {
//     console.error("Error creating Razorpay order:", error);
//     res.status(500).json({ message: "Order creation failed", error });
//   }
// };

// // Verify Razorpay Payment
// const verifyOrder = (req, res) => {
//   try {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//     const body = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body.toString())
//       .digest("hex");

//     if (expectedSignature === razorpay_signature) {
//       res.status(200).json({ status: "success" });
//     } else {
//       res.status(400).json({ status: "failure", message: "Signature mismatch" });
//     }
//   } catch (error) {
//     console.error("Error verifying Razorpay payment:", error);
//     res.status(500).json({ message: "Verification failed", error });
//   }
// };

// module.exports={createOrder,verifyOrder}