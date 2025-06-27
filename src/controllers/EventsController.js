const eventModel = require("../models/EventsModel")
const ticketModel = require("../models/TicketModal")
// const userModel = require("../models/UserModel")
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
 
    //convert let/lng to Number
    if (req.body.latitude) {
      req.body.latitude = parseFloat(req.body.latitude);
    }
    if (req.body.longitude) {
      req.body.longitude = parseFloat(req.body.longitude);
    }
    
      // Secure: take organizer ID from logged-in user
    req.body.organizerId = req.user._id;  //req.user._if from jwttoken

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


// const addEventWithFile = async(req,res)=>{

//     upload(req, res, async(err) =>{
//         if(err){
//             console.log(err),
//             res.status(500).json({
//                 message:err.message
//             })
//         }else{
             
//             const cloudinartResponse = await cloudinaryUtil.uploadFileToCloudinary(req.file);
//             console.log(cloudinartResponse)
//             console.log(req.body)

//             //data store in database
//             req.body.eventImgUrl = cloudinartResponse.secure_url
//             const savedEvent = await eventModel.create(req.body);

//             res.status(200).json({
//                 message:"Event Add successfully",
//                 data:savedEvent
//             })
//         }
//     })

// }

const getAllEvents = async (req, res) => {
  try {
    const allEvents = await eventModel
      .find()
      .populate("stateId")
      .populate("cityId")
      .populate("organizerId")

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

// const getAllEvents = async(req,res)=>{
//    try{
//     const allEvents = await eventModel.find().populate("stateId cityId organizerId")
//     if(allEvents.length === 0){
//         res.status(404).json({
//             message:"Events not found.. ",
//         })
//     }else{
//       res.status(200).json({
//         message:"Events found successfully",
//         data:allEvents
//       })
//     }
//    }catch(err){
//     res.status(500).json({
//         message:err.message
//     })
//    }
    
// }


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


// const updateEvent = async (req, res) => {
//   try {
//     const updateData = { ...req.body };

//     // Convert dates
//     if (updateData.startDate) {
//       updateData.startDate = new Date(updateData.startDate);
//     }
//     if (updateData.endDate) {
//       updateData.endDate = new Date(updateData.endDate);
//     }

//     //  If a new image is uploaded
//     if (req.file) {
//       const cloudinaryResponse = await cloudinaryUtil.uploadFileToCloudinary(req.file);
//       updateData.eventImgUrl = cloudinaryResponse.secure_url; 
//     }

//     const updatedEvent = await eventModel.findByIdAndUpdate(req.params.id, updateData, { new: true });

//     res.status(200).json({
//       message: "Event updated successfully",
//       data: updatedEvent,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error while updating event",
//       error: err.message,
//     });
//   }
// };

// const updateEvent = async(req,res)=>{

//     try{
//         const updateEvent = await eventModel.findByIdAndUpdate(req.params.id, req.body, {new:true})

//         res.status(200).json({
//             message:"Event updated Successfully",
//             data:updateEvent
//         })
//     }catch(err){
//         res.status(500).json({
//             message:"error while update Event",
//             err:err
//         })
//     }
// }

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
    const event = await eventModel.findById(req.params.id)
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
    const { stateId, cityId, quantity = 1 } = req.body;

    // ✅ Ensure the logged-in user is booking for themselves
    // if (req.user._id !== userId) {
    //   return res.status(403).json({ message: "You can only book for your own account." });
    // }

   const userId = req.user._id;

    const event = await eventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const availableSeats = event.numberOfSeats - event.bookedSeats;

    // Prevent negative or overbooking
    if (availableSeats <= 0) {
      return res.status(400).json({ message: "Event is sold out" });
    }

    if (availableSeats < quantity) {
      return res.status(400).json({ message: `Only ${availableSeats} seat(s) left` });
    }

    //  Update seat count safely
    event.bookedSeats += quantity;
    if (event.bookedSeats > event.numberOfSeats) {
      return res.status(400).json({ message: "Cannot exceed total seat capacity" });
    }

    await event.save();

    //  Create ticket record
    const ticket = await ticketModel.create({
      eventId,
      userId: req.user._id,
      stateId,
      cityId,
      organizerId: event.organizerId,
      quantity,
    });

    res.status(200).json({
      message: "Seat(s) booked successfully",
      data: { ticket, event },
    });

  } catch (err) {
    console.error("Error booking seat:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};


// const bookSeat = async (req, res) => {
//   try {
//     const eventId = req.params.id;
//     const { userId, stateId, cityId, quantity = 1 } = req.body;
    
//       // Ensure the logged-in user is booking for themselves
//     if (req.user._id !== userId) {
//       return res.status(403).json({ message: "You can only book for your own account." });
//     }

//     const event = await eventModel.findById(eventId);
//     if (!event) return res.status(404).json({ message: "Event not found" });

//     const availableSeats = event.numberOfSeats - event.bookedSeats; //if user request more seats then available 
//     if (availableSeats < quantity) {
//       return res.status(400).json({ message: `Only ${availableSeats} seats left` });
//     }

//     event.bookedSeats += quantity;
//     await event.save();
 
//     //create a new record in ticketmodel with all booking details
//     const ticket = await ticketModel.create({
//       eventId,
//       userId: req.user._id, 
//       stateId,
//       cityId,
//       organizerId: event.organizerId,
//       quantity,
//     });


//     res.status(200).json({
//       message: "Seat(s) booked successfully",
//       data: { ticket, event },
//     });
//   } catch (err) {
//     console.error("Error booking seat:", err);
//     res.status(500).json({ message: "Internal Server Error", error: err.message });
//   }
// };




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