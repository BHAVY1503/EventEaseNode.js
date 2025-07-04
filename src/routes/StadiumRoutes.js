const express = require("express")
const routes = express.Router()
const stadiumController = require("../controllers/StadiumController")
const { verifyToken, checkRole} = require("../middleware/auth")
const upload = require("../middleware/upload");

routes.post("/admin/stadium",verifyToken,checkRole(["Admin"]),upload.single("image"),stadiumController.addStadium)
routes.put("/stadium/:id",verifyToken,checkRole(["Admin"]), upload.single("image"),stadiumController.updateStadium);

routes.get("/admin/stadiums", verifyToken,checkRole(["Admin", "Organizer"]), stadiumController.getAllStadiums);
routes.get("/stadium/:id",verifyToken,checkRole(["Admin"]), stadiumController.getStadiumById);
routes.get("/mystadiums", verifyToken,checkRole(["Organizer","Admin"]), stadiumController.getMyStadiums);

module.exports = routes