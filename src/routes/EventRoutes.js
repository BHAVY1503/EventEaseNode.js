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
routes.put("/updateevent/:id",upload.single("image"), eventController.updateEvent)
routes.delete("/deleteevent/:id",eventController.deleteEvent)
routes.get("/geteventbyuserid/:userId",eventController.getEventByUserId)
routes.get("/geteventbyid/:id",eventController.getEventById)
routes.get("/stats", eventController.getStats); 
routes.get("/geteventstats", eventController.getEventStats); //for total events and active events
routes.post("/bookseat/:id", eventController.bookSeat);
routes.get("/tickets/:userId", eventController.getTicketsByUser);
routes.get("/getticketsbyuser/:userId",eventController.getTicketsByUser);





module.exports = routes