// routes/TicketRoutes.js
const express = require("express");
const router = express.Router();
const TicketController = require("../controllers/TicketController");

router.get("/organizer/:organizerId", TicketController.getTicketsByOrganizer);

module.exports = router;
