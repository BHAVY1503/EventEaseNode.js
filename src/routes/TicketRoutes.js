// routes/TicketRoutes.js
const express = require("express");
const routes = express.Router();
const TicketController = require("../controllers/TicketController");
const { verifyToken, checkRole } = require("../middleware/auth")

routes.get("/organizer/:organizerId",verifyToken,checkRole("Organizer"), TicketController.getTicketsByOrganizer);
routes.get("/usertickets/:userId",verifyToken,checkRole("User","Organizer") ,TicketController.getTicketsByUser);
routes.get("/alltickets",verifyToken,checkRole(["Admin"]),TicketController.getAllTicketsGroupedByEvent)

// invoice routes
routes.get("/invoice/:ticketId", verifyToken, checkRole(["User", "Organizer", "Admin"]), TicketController.getInvoiceData);
routes.get("/invoice/:ticketId/download", verifyToken, checkRole(["User", "Organizer", "Admin"]), TicketController.generateInvoice);

module.exports = routes;
