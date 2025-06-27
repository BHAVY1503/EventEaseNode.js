const express = require("express")
const routes = express.Router()
const stadiumController = require("../controllers/StadiumController")
const { verifyToken, checkRole} = require("../middleware/auth")
const upload = require("../middleware/upload");

routes.post("/admin/stadium",verifyToken,checkRole(["Admin"]),upload.single("image"),stadiumController.addStadium)
routes.get("/admin/stadiums", verifyToken,checkRole(["Admin", "Organizer"]), stadiumController.getAllStadiums);
routes.get("/stadium/:id", stadiumController.getStadiumById);
routes.get("/mystadiums", verifyToken,checkRole(["Organizer","Admin"]), stadiumController.getMyStadiums);

module.exports = routes