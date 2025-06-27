// routes/TicketRoutes.js
const express = require("express");
const routes = express.Router();
const TicketController = require("../controllers/TicketController");
const { verifyToken, checkRole } = require("../middleware/auth")

routes.get("/organizer/:organizerId",verifyToken,checkRole("Organizer"), TicketController.getTicketsByOrganizer);
routes.get("/usertickets/:userId",verifyToken,checkRole("User","Organizer") ,TicketController.getTicketsByUser);
routes.get("/alltickets",verifyToken,checkRole(["Admin"]),TicketController.getAllTicketsGroupedByEvent)

module.exports = routes;
