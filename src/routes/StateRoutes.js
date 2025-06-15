const express = require("express")
const routes = express.Router()
const stateController = require("../controllers/StateController")

routes.post("/addstate",stateController.addState)
routes.get("/getallstates",stateController.getAllStates)
routes.get("/getstate/:id",stateController.getStateById)

module.exports = routes