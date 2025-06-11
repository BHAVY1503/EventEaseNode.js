const routes = require("express").Router()
const roleController = require("../controllers/RoleController")
routes.get("/roles",roleController.getAllRoles)
routes.post("/roles",roleController.addRoles)
routes.delete("/roles/:id",roleController.deleteRoles)
routes.get("/roles/:id",roleController.getRoleById)

module.exports = routes