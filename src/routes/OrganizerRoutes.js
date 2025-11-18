const express = require("express");
const routes = express.Router();
const OrganizerController = require("../controllers/OrganizerController");
const { verifyToken, checkRole } = require("../middleware/auth");
// const routes = require("./TicketRoutes");

// 🔍 DEBUG: Log all incoming requests
// routes.use((req, res, next) => {
//   console.log("=== ORGANIZER ROUTE HIT ===");
//   console.log("Method:", req.method);
//   console.log("Original URL:", req.originalUrl);
//   console.log("Base URL:", req.baseUrl);
//   console.log("Path:", req.path);
//   console.log("Params:", req.params);
//   next();
// });

// Public routes
routes.post("/signup", OrganizerController.organizerRegister);
routes.post("/signin", OrganizerController.organizerSignin);
routes.post("/googlelogin", OrganizerController.googleLogin);

// ✔ FIX: put this BEFORE /organizer/:id
routes.get("/verify/:token", OrganizerController.verifyOrganizerEmail);

// Protected routes
routes.get("/allorganizers", verifyToken, checkRole(["Admin"]), OrganizerController.getAllOrganizers);
routes.get("/organizer/self", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerSelf);

// ❗ dynamic route - MUST COME LAST
routes.get("/organizer/:id", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerById);

routes.post("/updateorganizer/:id", verifyToken, checkRole(["Organizer"]), OrganizerController.updateOrganizer);
routes.delete("/deleteorganizer/:id", verifyToken, checkRole(["Admin"]), OrganizerController.deleteOrganizer);

routes.post("/resend-verification", verifyToken, OrganizerController.resendOrganizerVerification);



// Public routes
// routes.post("/organizer/signup", OrganizerController.organizerRegister);
// routes.post("/signin", OrganizerController.organizerSignin);
// routes.post("/googlelogin",OrganizerController.googleLogin);

// // Protected routes (only for authenticated organizers)
// routes.get("/allorganizers", verifyToken, checkRole(["Admin"]), OrganizerController.getAllOrganizers);
// routes.get("/organizer/self", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerSelf);
// routes.get("/organizer/:id", verifyToken, checkRole(["Organizer", "Admin"]), OrganizerController.getOrganizerById);
// routes.post("/updateorganizer/:id", verifyToken, checkRole(["Organizer"]), OrganizerController.updateOrganizer);
// routes.delete("/deleteorganizer/:id", verifyToken, checkRole(["Admin"]), OrganizerController.deleteOrganizer);

// routes.get("/verify/:token", OrganizerController.verifyOrganizerEmail);
// routes.post("/resend-verification", verifyToken, OrganizerController.resendOrganizerVerification)

module.exports = routes;


