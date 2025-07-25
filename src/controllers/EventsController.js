const eventModel = require("../models/EventsModel")
const ticketModel = require("../models/TicketModal")
const stadiumModel = require("../models/StadiumModel")
// const userModel = require("../models/UserModel")
const userModel = require("../models/UserModel")
const { sendingMail } = require("../utils/MailUtils");

const multer = require("multer") //for uploading files
const path = require("path")
const cloudinaryUtil = require("../utils/CloudinaryUtils");
const { json } = require("stream/consumers");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  //fileFilter:
}).single("image");

const addEventWithFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const cloudinaryResponse = await cloudinaryUtil.uploadFileToCloudinary(req.file);
    req.body.eventImgUrl = cloudinaryResponse.secure_url;

    // Convert lat/lng
    if (req.body.latitude) req.body.latitude = parseFloat(req.body.latitude);
    if (req.body.longitude) req.body.longitude = parseFloat(req.body.longitude);

    // Organizer from token
    req.body.organizerId = req.user._id;

    // ✅ Handle zonePrices override for Indoor events
   if (req.body.eventCategory === "Indoor" && req.body.zonePrices) {
  try {
    let zonePrices = [];

    if (typeof req.body.zonePrices === "string") {
      zonePrices = JSON.parse(req.body.zonePrices);
    } else if (Array.isArray(req.body.zonePrices)) {
      zonePrices = req.body.zonePrices;
    }

    // Convert to valid numbers
    zonePrices = zonePrices.map((p) => {
      const num = Number(p);
      return isNaN(num) ? null : num;
    });

    // Fetch stadium
    const stadium = await stadiumModel.findById(req.body.stadiumId);
    if (!stadium) return res.status(404).json({ message: "Stadium not found" });

    const updatedZones = stadium.zones.map((zone, index) => {
      const fallback = zone.price;
      const override = zonePrices[index];

      return {
        zoneName: `Zone ${String.fromCharCode(65 + index)}`, // A, B, C...
        seatLabels: zone.seatLabels,
        price: typeof override === "number" ? override : fallback
      };
    });

    req.body.zonePrices = updatedZones.map((z) => z.price);   // To store simple prices
    req.body.customZones = updatedZones;                      // To store full zone info

  } catch (err) {
    console.error("Invalid zonePrices format", err);
    return res.status(400).json({ message: "Invalid zonePrices format" });
  }
}

    const savedEvent = await eventModel.create(req.body);

    res.status(200).json({
      message: "Event added successfully",
      data: savedEvent,
    });
  } catch (err) {
    console.error("Error uploading event:", err);
    res.status(500).json({ message: err.message });
  }
};



const getAllEvents = async (req, res) => {
  try {
    const allEvents = await eventModel
      .find()
      .populate("stateId")
      .populate("cityId")
      .populate("organizerId")
      .populate("stadiumId")

    if (allEvents.length === 0) {
      return res.status(404).json({ message: "Events not found" });
    }

    res.status(200).json({
      message: "Events found successfully",
      data: allEvents,
    });
  } catch (err) {
    console.error(" Error in getAllEvents:", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};



const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
     const organizerId = req.user._id
    // Step 1: Find the existing event
    const existingEvent = await eventModel.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Step 2: Verify the organizer owns this event
    if (existingEvent.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized: You cannot edit this event" });
    }

    // Step 3: Prepare updated data
    const updateData = { ...req.body };

    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    // Step 4: Handle new image upload
    if (req.file) {
      const cloudinaryResponse = await cloudinaryUtil.uploadFileToCloudinary(req.file);
      updateData.eventImgUrl = cloudinaryResponse.secure_url;
    }

     // Indoor logic
    if (updateData.eventCategory === "Indoor" && updateData.stadiumId) {
      const stadium = await stadiumModel.findById(updateData.stadiumId);
      if (stadium) {
        updateData.numberOfSeats = stadium.totalSeats;
        updateData.latitude = stadium.location.latitude;
        updateData.longitude = stadium.location.longitude;
      }
    }

    // Outdoor: Make sure lat/lng present
    if (updateData.eventCategory === "Outdoor") {
      if (!updateData.latitude || !updateData.longitude) {
        return res.status(400).json({ message: "Latitude and longitude required for Outdoor events" });
      }
    }

    // Zoom logic
    if (updateData.eventCategory === "ZoomMeeting" && !updateData.zoomUrl) {
      return res.status(400).json({ message: "Zoom URL is required for ZoomMeeting" });
    }

    // Step 5: Perform update
    const updatedEvent = await eventModel.findByIdAndUpdate(eventId, updateData, { new: true });

    return res.status(200).json({
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (err) {
    console.error("Update Event Error:", err);
    return res.status(500).json({
      message: "Error while updating event",
      error: err.message,
    });
  }
};

module.exports = { updateEvent };


const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const organizerId = req.user._id;

    // Step 1: Find the event
    const event = await eventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Step 2: Check if this organizer owns the event
    if (event.organizerId.toString() !== organizerId.toString()) {
      return res.status(403).json({ message: "Unauthorized: You can't delete this event" });
    }

    // Step 3: Delete the event
    const deletedEvent = await eventModel.findByIdAndDelete(eventId);

    return res.status(200).json({
      message: "Event deleted successfully",
      data: deletedEvent,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error while deleting event",
      error: err.message,
    });
  }
};


const getEventByOrganizerId = async (req, res) => {
  // const { userId } = req.params;
  try {
    const allevent = await eventModel
      .find({ organizerId:req.user._id }) //here userid is a organizer
      .populate("stateId", "Name") 
      .populate("cityId", "name")
      .populate("organizerId", "name")
      .populate("stadiumId")
    if (allevent.length === 0) {
      return res.status(404).json({ message: "No event found" });
    }

    res.status(200).json({
      message: "Events found successfully",
      data: allevent,
    });
  } catch (err) {
    console.error("Error in getEventByUserId:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
};


const getEventById = async(req,res)=>{
 
  try{
    const event = await eventModel.findById(req.params.id).populate("stadiumId")
    if(!event){
      res.status(404).json({
        message:"no event found.."
      })
      }else{
        res.status(200).json({
          message:"event found successfully..",
          data:event
        })
      }
    }catch(err){
      message:err
    }
  }

  const getStats = async (req, res) => {
  try {
    const allEvents = await eventModel.find();

    const eventCount = allEvents.length;

    let averageRating = 0;
    if (eventCount > 0) {
      const totalRating = allEvents.reduce((sum, ev) => sum + (ev.rating || 0), 0);
      averageRating = (totalRating / eventCount).toFixed(1);
    }

    res.status(200).json({
      message: "Event statistics fetched successfully",
      data: {
        eventCount,
        averageRating: parseFloat(averageRating),
      },
    });
  } catch (err) {
    console.error("Error getting stats:", err);
    res.status(500).json({ message: err.message });
  }
};


const getEventStats = async (req, res) => {
  try {
    const totalEvents = await eventModel.countDocuments();
    const now = new Date();
    const activeEvents = await eventModel.countDocuments({ endDate: { $gte: now } }); //filter active/upcoming event is not yet ended

    res.status(200).json({
      totalEvents,
      activeEvents,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bookSeat = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { stateId, cityId, quantity = 1, selectedSeats = [], stadiumId } = req.body;
    const userId = req.user._id;

    // Step 1: Fetch event and populate stadium zones
    const event = await eventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Step 2: Ensure bookedSeatLabels is initialized
    event.bookedSeatLabels = event.bookedSeatLabels || [];

    // Step 3: Check for already booked seats
    const alreadyBooked = selectedSeats.some(seat => event.bookedSeatLabels.includes(seat));
    if (alreadyBooked) {
      return res.status(400).json({ message: "One or more selected seats are already booked." });
    }

    // Step 4: Check seat availability
    const availableSeats = event.numberOfSeats - event.bookedSeats;
    if (availableSeats <= 0) {
      return res.status(400).json({ message: "Event is sold out" });
    }
    if (availableSeats < quantity) {
      return res.status(400).json({ message: `Only ${availableSeats} seat(s) left` });
    }

    // Step 5: Calculate ticket price
    let ticketRate = 0;

    if (event.eventCategory === "Indoor" && selectedSeats.length > 0) {
      const zones = event.customZones || []; // Organizer's customized zones
      for (const zone of zones) {
        const zoneSeats = zone.seatLabels || [];
        const seatsInZone = selectedSeats.filter(seat => zoneSeats.includes(seat));
        ticketRate += seatsInZone.length * zone.price;

        // Debug: log matched seats
        console.log(`Zone: ${zone.zoneName || "Unnamed"}, Price: ${zone.price}, Seats matched:`, seatsInZone);
      }
    } else {
      ticketRate = event.ticketRate * quantity; // For Zoom/Outdoor events
    }

    // Step 6: Update event booking data
    event.bookedSeats += quantity;
    event.bookedSeatLabels.push(...selectedSeats);
    if (event.bookedSeats > event.numberOfSeats) {
      return res.status(400).json({ message: "Cannot exceed total seat capacity" });
    }
    await event.save();

    // Step 7: Create ticket
    const ticket = await ticketModel.create({
      eventId,
      userId,
      stateId,
      cityId,
      selectedSeats,
      stadiumId,
      organizerId: event.organizerId,
      quantity,
      ticketRate,
    });

    // Step 8: Send email
    const user = await userModel.findById(userId);
    if (user && user.email) {
      let venueInfo = "To be announced";

      const mapsLink =
        event.latitude && event.longitude
          ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}`
          : null;

      if (event.eventCategory === "ZoomMeeting" && event.zoomUrl) {
        venueInfo = `<a href="${event.zoomUrl}" target="_blank">Join Zoom Meeting</a>`;
      } else if (mapsLink) {
        venueInfo = `<a href="${mapsLink}" target="_blank">${event.location || "View on Map"}</a>`;
      }

      const htmlContent = `
        <h2>🎟️ Ticket Confirmation - ${event.eventName}</h2>
        <p>Dear ${user.name || "User"},</p>
        <p>Thank you for booking your seat(s) for <strong>${event.eventName}</strong>.</p>
        <p><strong>Date:</strong> ${new Date(event.startDate).toDateString()}</p>
        <p><strong>Venue:</strong> ${venueInfo}</p>
        <p><strong>Selected Seats:</strong> ${selectedSeats.length ? selectedSeats.join(", ") : "General Admission"}</p>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Total Price:</strong> ₹${ticketRate}</p>
        <br/>
        <p>Enjoy the event!</p>
        <p>- EventEase Team</p>
      `;

      try {
        await sendingMail(user.email, "Your Ticket Booking Confirmation", htmlContent);
        console.log("✅ Confirmation email sent to", user.email);
      } catch (emailErr) {
        console.error("❌ Failed to send email:", emailErr.message);
      }
    }

    // Step 9: Respond to frontend
    res.status(200).json({
      message: "Seat(s) booked successfully",
      data: { ticket, event },
    });
  } catch (err) {
    console.error("❌ Error booking seat:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};



const getTicketsByUser = async (req, res) => {
  try {
    const tickets = await ticketModel.find({ userId: req.params.userId }).populate('eventId').populate('userId', 'name email')
    .populate("stateId", "Name") // only get state name
      .populate("cityId", "name"); 
    res.status(200).json({ data: tickets });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
 


const getEventsGroupedByOrganizer = async (req, res) => {
  try {
    const groupedEvents = await eventModel.aggregate([
      {
        $group: {
          _id: "$organizerId",
          events: { $push: "$$ROOT" }, // push entire event document
        },
      },
      {
        $lookup: {
          from: "organizers", // collection name
          localField: "_id",
          foreignField: "_id",
          as: "organizerInfo",
        },
      },
      {
        $unwind: "$organizerInfo"
      },
      {
        $project: {
          organizerName: "$organizerInfo.name",
          organizerEmail: "$organizerInfo.email",
          events: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: groupedEvents });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to group events", error });
  }
};







module.exports = {
    addEventWithFile,
    getAllEvents,
    updateEvent,
    deleteEvent,
    getEventByOrganizerId,
    getEventById,
    getStats,
    getEventStats,
    bookSeat,
    getTicketsByUser,
    getEventsGroupedByOrganizer
    
}