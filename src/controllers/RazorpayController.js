const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentModel = require("../models/PaymentModel");
const EventModel = require("../models/EventsModel"); // adjust path
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
// const createOrder = async (req, res) => {
//   try {
//     const { amount, eventId, organizerId } = req.body;

//     if (!amount || amount < 1) {
//       return res.status(400).json({ success: false, message: "Invalid amount" });
//     }

//     // Create Razorpay order
//     const options = {
//       amount: amount * 100, // convert ₹ → paise
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//       notes: {
//         userId: req.user._id.toString(),
//         eventId,
//       },
//     };

//     const order = await razorpay.orders.create(options);

//     // ✅ Save order in DB with status "pending" (no paymentId yet)
//     const payment = new PaymentModel({
//       userId: req.user._id,
//       organizerId : req.user.role === "Organizer" ? req.user._id : organizerId,
//       eventId,
//       orderId: order.id,
//       amount,
//       status: "pending",
//     });

//     await payment.save();

//     res.status(200).json({
//       success: true,
//       order,
//     });
//   } catch (error) {
//     console.error("Payment Order Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error creating payment order",
//     });
//   }
// };
const createOrder = async (req, res) => {
  try {
    const { amount, eventId } = req.body;

    // 1️⃣ Fetch event to get organizer
    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // 2️⃣ Organizer always comes from event
    const finalOrganizerId = event.organizerId;

    // 3️⃣ Create Razorpay order
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // 4️⃣ Save payment
    const payment = new PaymentModel({
      userId: req.user._id,
      organizerId: finalOrganizerId,   // 🔥 FIXED
      eventId,
      orderId: order.id,
      amount,
      status: "pending",
    });

    await payment.save();

    res.status(200).json({ success: true, order });

  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ success: false, message: err.message });
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
    // const payment = await PaymentModel.findOneAndUpdate(
    //   { orderId: razorpay_order_id },
    //   {
    //     status: "completed",
    //     paymentId: razorpay_payment_id,
    //     updatedAt: Date.now(),
    //   },
    //   { new: true }
    // )
    //   .populate("eventId")
    //   .populate("userId")
    //   .populate("organizerId");
    let payment = await PaymentModel.findOneAndUpdate(
  { orderId: razorpay_order_id },
  {
    status: "completed",
    paymentId: razorpay_payment_id,
    updatedAt: Date.now(),
  },
  { new: true }
);

if (!payment) {
  return res.status(404).json({ success: false, message: "Payment not found" });
}

// Ensure EVENT details (Outdoor/Indoor/Zoom) are always loaded
payment = await payment.populate([
  { path: "eventId" },
  { path: "userId" },
  { path: "organizerId" }
]);
// await payment.populate("eventId");
// await payment.populate("userId");
// await payment.populate("organizerId");


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
      // Replace the mailOptions in your code with this:

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: recipient.email,
  subject: `🎉 Payment Successful - ${payment.eventId.eventName}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; }
        .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin: 0; }
        .header-subtitle { color: #e0e7ff; font-size: 16px; margin-top: 10px; }
        .content { padding: 40px 30px; }
        .success-badge { background-color: #dcfce7; color: #166534; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: 600; margin: 20px 0; }
        .greeting { font-size: 20px; color: #111827; margin-bottom: 20px; }
        .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
        .details-box { background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #6b7280; font-weight: 500; }
        .detail-value { color: #111827; font-weight: 600; }
        .amount-highlight { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; }
        .amount-label { font-size: 14px; opacity: 0.9; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .social-links { margin: 20px 0; }
        .social-links a { color: #2563eb; text-decoration: none; margin: 0 10px; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #2563eb, transparent); margin: 30px 0; }
        @media only screen and (max-width: 600px) {
          .content { padding: 30px 20px; }
          .header { padding: 30px 20px; }
          .amount-value { font-size: 28px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1 class="logo">🎟️ EventEase</h1>
          <p class="header-subtitle">Your Event Management Partner</p>
        </div>

        <!-- Content -->
        <div class="content">
          <div style="text-align: center;">
            <span class="success-badge">✅ Payment Successful</span>
          </div>

          <h2 class="greeting">Hi ${recipient.fullName || recipient.name}! 🎉</h2>
          
          <p class="message">
            Great news! Your payment has been successfully processed. You're all set for an amazing experience at <strong>${payment.eventId.eventName}</strong>!
          </p>

          <!-- Amount Highlight -->
          <div class="amount-highlight">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">₹${payment.amount.toLocaleString()}</div>
          </div>

          <!-- Event Details -->
          <div class="details-box">
            <h3 style="margin-top: 0; color: #2563eb;">📅 Event Details</h3>
            <div class="detail-row">
              <span class="detail-label">Event Name</span>
              <span class="detail-value">${payment.eventId.eventName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${new Date(payment.eventId.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Payment ID</span>
              <span class="detail-value">${payment.paymentId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Invoice ID</span>
              <span class="detail-value">INV-${payment._id.toString().slice(-8).toUpperCase()}</span>
            </div>
          </div>

          <div class="divider"></div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            📎 Your detailed invoice is attached to this email for your records.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; margin-bottom: 20px;">Need help or have questions?</p>
            <a href="mailto:${process.env.EMAIL_USER}" class="cta-button">Contact Support</a>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827;">Thank you for choosing EventEase!</p>
          <p style="margin: 0 0 20px 0;">We're excited to see you at the event! 🎊</p>
          
          <div class="social-links">
            <a href="#">Facebook</a> • 
            <a href="#">Twitter</a> • 
            <a href="#">Instagram</a>
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 5px 0; font-size: 12px;">© ${new Date().getFullYear()} EventEase. All rights reserved.</p>
            <p style="margin: 5px 0; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
  attachments: [
    {
      filename: `Invoice_${payment._id}.pdf`,
      path: filePath,
    },
  ],
};
      // const mailOptions = {
      //   from: process.env.EMAIL_USER,
      //   to: recipient.email,
      //   subject: `🎟️ Payment Successful - ${payment.eventId.eventName}`,
      //   text: `Hi ${recipient.fullName || recipient.name},\n\nYour payment for "${payment.eventId.eventName}" was successful.\nPlease find your invoice attached.\n\nThank you for using EventEase!`,
      //   attachments: [
      //     {
      //       filename: `Invoice_${payment._id}.pdf`,
      //       path: filePath,
      //     },
      //   ],
      // };

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

// const processRefund = async (req, res) => {
//   try {
//     const ticket = await ticketModel
//       .findById(req.params.ticketId)
//       .populate("eventId");

//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     if (ticket.refundStatus !== "Pending") {
//       return res.status(400).json({ message: "Refund is not approved or already processed" });
//     }

//     const payment = await PaymentModel.findOne({
//       eventId: ticket.eventId._id,
//       userId: ticket.userId._id
//     });

//     const refund = await razorpay.payments.refund(payment.paymentId, {
//       amount: ticket.refundAmount * 100,
//     });

//     ticket.refundStatus = "Completed";
//     ticket.refundTransactionId = refund.id;
//     ticket.refundDate = new Date();
//     await ticket.save();

//     return res.json({
//       success: true,
//       message: "Refund sent successfully",
//       refundDetails: refund
//     });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
// In RazorpayController.js - Replace your processRefund function

const processRefund = async (req, res) => {
  try {
    const ticket = await ticketModel
      .findById(req.params.ticketId)
      .populate("eventId")
      .populate("userId");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.refundStatus !== "Pending") {
      return res.status(400).json({ 
        message: "Refund is not approved or already processed" 
      });
    }

    // Find the payment record
    const payment = await PaymentModel.findOne({
      eventId: ticket.eventId._id,
      userId: ticket.userId._id
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // 🔥 Process Razorpay refund
    const refund = await razorpay.payments.refund(payment.paymentId, {
      amount: ticket.refundAmount * 100, // Convert to paise
    });

    // 🔥 Update ticket status
    ticket.refundStatus = "Completed";
    ticket.refundTransactionId = refund.id;
    ticket.refundDate = new Date();
    await ticket.save();

    // 🔥 SEND REFUND COMPLETION EMAIL
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: ticket.userId.email,
        subject: `💰 Refund Processed - ${ticket.eventId.eventName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-badge { background: #dcfce7; color: #166534; padding: 10px 20px; 
                              border-radius: 20px; display: inline-block; font-weight: bold; }
              .details-box { background: white; padding: 20px; margin: 20px 0; 
                            border-left: 4px solid #10b981; border-radius: 5px; }
              .detail-row { display: flex; justify-content: space-between; 
                           padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-row:last-child { border-bottom: none; }
              .amount-highlight { background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                 color: white; padding: 20px; text-align: center; 
                                 border-radius: 10px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎟️ EventEase</h1>
                <p>Refund Confirmation</p>
              </div>
              
              <div class="content">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span class="success-badge">✅ Refund Processed Successfully</span>
                </div>

                <h2>Hi ${ticket.userId.fullName || ticket.userId.name}! 👋</h2>
                
                <p>Great news! Your refund has been successfully processed and the amount 
                has been credited back to your original payment method.</p>

                <div class="amount-highlight">
                  <div style="font-size: 14px; opacity: 0.9;">Refund Amount</div>
                  <div style="font-size: 32px; font-weight: bold;">
                    ₹${ticket.refundAmount.toLocaleString()}
                  </div>
                </div>

                <div class="details-box">
                  <h3 style="margin-top: 0; color: #10b981;">📋 Refund Details</h3>
                  
                  <div class="detail-row">
                    <span style="color: #6b7280;">Event Name</span>
                    <strong>${ticket.eventId.eventName}</strong>
                  </div>
                  
                  <div class="detail-row">
                    <span style="color: #6b7280;">Refund Transaction ID</span>
                    <strong>${refund.id}</strong>
                  </div>
                  
                  <div class="detail-row">
                    <span style="color: #6b7280;">Original Payment ID</span>
                    <strong>${payment.paymentId}</strong>
                  </div>
                  
                  <div class="detail-row">
                    <span style="color: #6b7280;">Refund Date</span>
                    <strong>${new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                    })}</strong>
                  </div>
                  
                  <div class="detail-row">
                    <span style="color: #6b7280;">Ticket ID</span>
                    <strong>${ticket._id}</strong>
                  </div>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; 
                           border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⏱️ Processing Time:</strong><br>
                    The refund will appear in your account within 5-7 business days, 
                    depending on your bank's processing time.
                  </p>
                </div>

                <p style="color: #6b7280; font-size: 14px;">
                  If you have any questions or concerns about this refund, 
                  please don't hesitate to contact our support team.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="mailto:${process.env.EMAIL_USER}" 
                     style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                            color: white; padding: 12px 30px; text-decoration: none; 
                            border-radius: 8px; font-weight: 600;">
                    Contact Support
                  </a>
                </div>
              </div>

              <div class="footer">
                <p style="margin: 0 0 10px 0;"><strong>Thank you for using EventEase!</strong></p>
                <p style="margin: 0;">© ${new Date().getFullYear()} EventEase. All rights reserved.</p>
                <p style="margin: 10px 0 0 0; font-size: 12px;">
                  This is an automated email. Please do not reply.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Refund completion email sent to ${ticket.userId.email}`);

    } catch (mailErr) {
      console.error("❌ Refund email failed:", mailErr);
      // Don't fail the entire request if email fails
    }

    return res.json({
      success: true,
      message: "Refund processed successfully and user notified via email",
      refundDetails: {
        refundId: refund.id,
        amount: ticket.refundAmount,
        status: refund.status,
        createdAt: refund.created_at
      }
    });

  } catch (error) {
    console.error("❌ Refund Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to process refund",
      error: error.message 
    });
  }
};


module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  processRefund
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