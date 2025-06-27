const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const { verifyToken, checkRole } = require("../middleware/auth");

// Public routes
router.post("/user", userController.signup);
router.post("/user/login", userController.loginUser);
router.post("/user/googlelogin",userController.googleLogin);


// Protected routes (example: only allow authenticated users)
router.get("/user", verifyToken,checkRole(["Admin"]), userController.getAllUsers);
router.delete("/deleteuser/:id", verifyToken,checkRole(["Admin"]), userController.deleteUser);
router.get("/user/getuserbytoken", verifyToken, userController.getUserByToken);
router.get("/user/:id", verifyToken, userController.getUserById);

module.exports = router;


// const express = require("express")
// const routes = express.Router()
// const userController = require("../controllers/UserController")

// routes.post("/user",userController.signup)
// routes.get("/user", userController.getAllUsers)
// routes.get("/user/:id", userController.getUserById)
// routes.post("/user/login",userController.loginUser)
// routes.delete("/user/:id", userController.deleteUser)

// module.exports = routes