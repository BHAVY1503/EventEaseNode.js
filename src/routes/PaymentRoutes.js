// routes/razorpayRoutes.js
const express = require("express");
const routes = express.Router();
const razorpayController = require("../controllers/RazorpayController")

// Route to create order
routes.post("/create_order", razorpayController.createOrder);

// Route to verify payment
routes.post("/verify_order",razorpayController.verifyOrder);

module.exports = routes;
