const express = require("express");
const routes = express.Router();
const OrganizerController = require("../controllers/OrganizerController");
const { verifyToken, checkRole } = require("../middleware/auth");
// const routes = require("./TicketRoutes");

// Public routes
routes.post("/organizer/signup", OrganizerController.organizerRegister);
routes.post("/signin", OrganizerController.organizerSignin);
routes.post("/googlelogin",OrganizerController.googleLogin);

// Protected routes (only for authenticated organizers)
routes.get("/allorganizers", verifyToken, checkRole(["Admin"]), OrganizerController.getAllOrganizers);
routes.get("/organizer/self", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerSelf);
routes.get("/organizer/:id", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerById);
routes.post("/updateorganizer/:id", verifyToken, checkRole(["Organizer"]), OrganizerController.updateOrganizer);
routes.delete("/deleteorganizer/:id", verifyToken, checkRole(["Admin"]), OrganizerController.deleteOrganizer);

module.exports = routes;


// const express = require("express")
// const routes = express.Router()
// const OrganizerController = require("../controllers/OrganizerController")

// routes.post("/organizer/signup",OrganizerController.organizerRegister)
// routes.get("/organizer", OrganizerController.getAllOrganizers)
// routes.get("/organizer/:id", OrganizerController.getOrganizerById)
// routes.post("/updateorganizer/:id", OrganizerController.updateOrganizer)
// routes.post("/organizer/signin", OrganizerController.organizerSignin)
// routes.delete("/organizer/:id",OrganizerController.deleteOrganizer)

// module.exports = routes