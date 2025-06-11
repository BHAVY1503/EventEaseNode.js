const express = require("express")
const routes = express.Router()
const organizerModel = require("../controllers/OrganizerController")

routes.post("/organizer",organizerModel.organizerRegister)
routes.get("/organizer", organizerModel.getAllOrganizers)
routes.get("/organizer/:id", organizerModel.getOrganizerById)
routes.post("/updateorganizer/:id", organizerModel.updateOrganizer)

module.exports = routes