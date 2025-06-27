const express = require("express")
const routes = express.Router()
const eventController = require("../controllers/EventsController")
const multer = require("multer")
const { verifyToken, checkRole} = require("../middleware/auth")

// multer config
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

//public routes (accessible for everyone)
routes.get("/getallevents",eventController.getAllEvents)
routes.get("/geteventbyid/:id",eventController.getEventById)


//Protected routes (authentication required)
routes.post("/addeventwithfile",verifyToken,checkRole(["Organizer","Admin"]), upload.single("image"), eventController.addEventWithFile)
routes.put("/updateevent/:id",verifyToken,checkRole(["Organizer", "Admin"]),upload.single("image"), eventController.updateEvent)
routes.delete("/deleteevent/:id",verifyToken,checkRole(["Organizer", "Admin"]),eventController.deleteEvent)
routes.get("/geteventbyorganizerid",verifyToken,checkRole(["Organizer"]),eventController.getEventByOrganizerId)
routes.post("/bookseat/:id",verifyToken,checkRole(["User","Organizer"]), eventController.bookSeat);
routes.get("/groupedeventsbyorganizer",verifyToken,checkRole(["Admin"]),eventController.getEventsGroupedByOrganizer)


routes.get("/stats", eventController.getStats); 
routes.get("/geteventstats", eventController.getEventStats); //for total events and active events
routes.get("/tickets/:userId", eventController.getTicketsByUser);
routes.get("/getticketsbyuser/:userId",eventController.getTicketsByUser);





module.exports = routes