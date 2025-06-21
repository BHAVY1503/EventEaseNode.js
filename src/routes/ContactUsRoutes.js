const express = require("express")
const routes = express.Router()
const contactusController = require("../controllers/ContactUsController")

routes.post("/contactus",contactusController.sendMessage)
routes.get("/contactus",contactusController.getMessage)

module.exports = routes