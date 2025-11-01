const express = require("express")
const routes = express.Router()
const contactusController = require("../controllers/ContactUsController")
const { verifyToken, checkRole} = require("../middleware/auth")


routes.post("/contactus",verifyToken,checkRole(["Organizer", "User"]),contactusController.sendMessage)
routes.get("/contactus",verifyToken,checkRole(["Admin"]),contactusController.getMessage)

module.exports = routes