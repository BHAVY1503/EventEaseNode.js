const express = require("express")
const routes = express.Router()
const OrganizerController = require("../controllers/OrganizerController")

routes.post("/organizer/signup",OrganizerController.organizerRegister)
routes.get("/organizer", OrganizerController.getAllOrganizers)
routes.get("/organizer/:id", OrganizerController.getOrganizerById)
routes.post("/updateorganizer/:id", OrganizerController.updateOrganizer)
routes.post("/organizer/signin", OrganizerController.organizerSignin)

module.exports = routes