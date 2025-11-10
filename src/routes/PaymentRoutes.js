// routes/razorpayRoutes.js
const express = require("express");
const routes = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const razorpayController = require("../controllers/RazorpayController")

// Route to create order
routes.post("/create_order",verifyToken,checkRole(['User', 'Organizer']) ,razorpayController.createOrder);

// Route to verify payment
routes.post("/verify_order",verifyToken,checkRole(['User', 'Organizer']), razorpayController.verifyPayment);

routes.get("/payment_history", verifyToken, checkRole(['User', 'Organizer']), razorpayController.getPaymentHistory)

module.exports = routes;
