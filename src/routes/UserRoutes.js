const express = require("express")
const routes = express.Router()
const userController = require("../controllers/UserController")

routes.post("/user",userController.signup)
routes.get("/user", userController.getAllUsers)
routes.get("/user/:id", userController.getUserById)
routes.post("/user/login",userController.loginUser)

module.exports = routes