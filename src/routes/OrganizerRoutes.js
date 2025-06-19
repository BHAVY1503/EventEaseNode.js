const express = require("express");
const router = express.Router();
const OrganizerController = require("../controllers/OrganizerController");
const { verifyToken, checkRole } = require("../middleware/auth");

// Public routes
router.post("/organizer/signup", OrganizerController.organizerRegister);
router.post("/organizer/signin", OrganizerController.organizerSignin);

// Protected routes (only for authenticated organizers)
router.get("/organizer", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getAllOrganizers);
router.get("/organizer/:id", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerById);
router.post("/updateorganizer/:id", verifyToken, checkRole(["Organizer"]), OrganizerController.updateOrganizer);
router.delete("/organizer/:id", verifyToken, checkRole(["Admin"]), OrganizerController.deleteOrganizer);

module.exports = router;


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