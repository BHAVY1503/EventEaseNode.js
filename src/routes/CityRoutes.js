const express = require("express")
const routes = express.Router()
const cityController = require("../controllers/CityController")

routes.post("/addcity", cityController.addcity)
routes.get("/getallcitys",cityController.getAllCities)
routes.get("/getcity/:id",cityController.getCityById)

module.exports = routes