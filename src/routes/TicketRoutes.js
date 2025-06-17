// routes/TicketRoutes.js
const express = require("express");
const routes = express.Router();
const TicketController = require("../controllers/TicketController");

routes.get("/organizer/:organizerId", TicketController.getTicketsByOrganizer);
routes.get("/usertickets/:userId", TicketController.getTicketsByUser);

module.exports = routes;
