const express = require("express")
const routes = express.Router()
const eventController = require("../controllers/EventsController")
const multer = require("multer");

// multer config
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

routes.post("/addeventwithfile", upload.single("image"), eventController.addEventWithFile)
routes.get("/getallevents",eventController.getAllEvents)
routes.put("/updateevent/:id", eventController.updateEvent)
routes.delete("/deleteevent/:id",eventController.deleteEvent)
routes.get("/geteventbyuserid/:userId",eventController.getEventByUserId)


module.exports = routes