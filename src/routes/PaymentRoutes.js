// routes/razorpayRoutes.js
const express = require("express");
const routes = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const razorpayController = require("../controllers/RazorpayController");
const webhookIpWhitelist = require("../middleware/ipWhiteList");
const { validateCreateOrder, validateVerifyPayment } = require("../middleware/validatePayment");

// Route to create order
routes.post("/create_order",verifyToken,checkRole(['User', 'Organizer']),validateCreateOrder ,razorpayController.createOrder);

// Route to verify payment
routes.post("/verify_order",razorpayController.verifyLimiter,verifyToken,checkRole(['User', 'Organizer']),validateVerifyPayment, razorpayController.verifyPayment);

// Use webhookIpWhitelist and rely on rawBody captured by global body parser
// (app.js stores raw buffer on req.rawBody via express.json verify option)
routes.post("/webhook", webhookIpWhitelist, razorpayController.webhookHandler);
// Public endpoint to get price for an event (zoneIndex optional, query or body)
routes.get("/event/:eventId/price", razorpayController.getEventPrice);
// Get payment by orderId (shows refunds and status). Allowed: User (own), Organizer (their event), Admin
routes.get("/order/:orderId", verifyToken, checkRole(['User','Organizer','Admin']), razorpayController.getPaymentByOrderId);

routes.get("/payment_history", verifyToken, checkRole(['User', 'Organizer']), razorpayController.getPaymentHistory)

// Public ticket verification route used by QR scans (no auth)
routes.get('/verify-ticket/:ticketId/:sig', razorpayController.verifyTicket);

module.exports = routes;
