const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentModel = require("../models/PaymentModel");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer"); 
const { request } = require("http");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------- CREATE ORDER -------------------
const createOrder = async (req, res) => {
  try {
    const { amount, eventId, organizerId } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // convert ₹ → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        eventId,
      },
    };

    const order = await razorpay.orders.create(options);

    // ✅ Save order in DB with status "pending" (no paymentId yet)
    const payment = new PaymentModel({
      userId: req.user._id,
      organizerId : req.user.role === "Organizer" ? req.user._id : organizerId,
      eventId,
      orderId: order.id,
      amount,
      status: "pending",
    });

    await payment.save();

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Payment Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment order",
    });
  }
};

// ------------------- VERIFY PAYMENT -------------------
// Verify payment signature and send invoice email
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      eventId,
      amount,
    } = req.body;

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // ✅ Update payment record
    const payment = await PaymentModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        status: "completed",
        paymentId: razorpay_payment_id,
        updatedAt: Date.now(),
      },
      { new: true }
    )
      .populate("eventId")
      .populate("userId")
      .populate("organizerId");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // ✅ Choose the correct recipient (User or Organizer)
    const recipient =
      payment.userId || payment.organizerId || { email: null, fullName: "Guest" };

    if (!recipient.email) {
      console.log("⚠️ No recipient email found for this payment.");
      return res.status(400).json({
        success: false,
        message: "No email found for this payment.",
      });
    }

    // ✅ Create invoice PDF
    const invoicesDir = path.join(__dirname, "../../invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

    const filePath = path.join(invoicesDir, `invoice_${payment._id}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(26).fillColor("#2563eb").text("EventEase", 50, 50);
    doc.fontSize(16).fillColor("#111").text("Payment Invoice", 400, 50);

    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: INV-${payment._id.toString().slice(-8).toUpperCase()}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Payment ID: ${payment.paymentId}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#2563eb").text("Customer Details:");
    doc.fontSize(11).fillColor("#111").text(`Name: ${recipient.fullName || recipient.name}`);
    doc.text(`Email: ${recipient.email}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#2563eb").text("Event Details:");
    doc.fontSize(11).fillColor("#111").text(`Event: ${payment.eventId?.eventName}`);
    doc.text(`Date: ${new Date(payment.eventId?.startDate).toLocaleDateString()}`);
    doc.text(`Amount Paid: ₹${payment.amount}`);
    doc.moveDown();

    doc.fontSize(12).fillColor("#16a34a").text("Status: Payment Successful ✅");

    doc.end();

    writeStream.on("finish", async () => {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipient.email,
        subject: `🎟️ Payment Successful - ${payment.eventId.eventName}`,
        text: `Hi ${recipient.fullName || recipient.name},\n\nYour payment for "${payment.eventId.eventName}" was successful.\nPlease find your invoice attached.\n\nThank you for using EventEase!`,
        attachments: [
          {
            filename: `Invoice_${payment._id}.pdf`,
            path: filePath,
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Invoice email sent to ${recipient.email}`);
      setTimeout(() => fs.unlink(filePath, () => {}), 10000);
    });

    res.status(200).json({
      success: true,
      status: "success",
      message: "Payment verified and invoice sent successfully",
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};




// const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;

//     // Verify signature
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (expectedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }

//     // ✅ Update payment record
//     const payment = await PaymentModel.findOneAndUpdate(
//       { orderId: razorpay_order_id },
//       {
//         paymentId: razorpay_payment_id,
//         status: "completed",
//       },
//       { new: true }
//     ).populate("eventId").populate("userId").populate("organizerId");

//     if (!payment) {
//       return res.status(404).json({ success: false, message: "Payment not found" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//       payment,
//     });
//   } catch (error) {
//     console.error("Payment Verification Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error verifying payment",
//     });
//   }
// };

// ------------------- GET PAYMENT HISTORY -------------------
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await PaymentModel.find({ userId: req.user._id })
      .populate("eventId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Payment History Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
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