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
      .populate("stateId cityId organizerId");

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
    const updateData = { ...req.body };

    // Convert dates
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    //  If a new image is uploaded
    if (req.file) {
      const cloudinaryResponse = await cloudinaryUtil.uploadFileToCloudinary(req.file);
      updateData.eventImgUrl = cloudinaryResponse.secure_url; 
    }

    const updatedEvent = await eventModel.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.status(200).json({
      message: "Event updated successfully",
      data: updatedEvent,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error while updating event",
      error: err.message,
    });
  }
};

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

const deleteEvent = async(req,res)=>{

    const deleteEvent = await eventModel.findByIdAndDelete(req.params.id)

    res.json({
        message:"Event Deleted..",
        data:deleteEvent
    })
}

const getEventByUserId = async (req, res) => {
  // const { userId } = req.params;
  try {
    const allevent = await eventModel
      .find({ userId:req.params.userId }) //here userid is a organizer
      .populate("stateId", "Name") 
      .populate("cityId", "name")
      .populate("userId", "fullName")
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
    const activeEvents = await eventModel.countDocuments({ endDate: { $gte: now } });

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
    const { userId, stateId, cityId, quantity = 1 } = req.body;

    const event = await eventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const availableSeats = event.numberOfSeats - event.bookedSeats;
    if (availableSeats < quantity) {
      return res.status(400).json({ message: `Only ${availableSeats} seats left` });
    }

    event.bookedSeats += quantity;
    await event.save();

    const ticket = await ticketModel.create({
      eventId,
      userId,
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
//     const userId = req.body.userId; // make sure this comes from frontend
//     const quantity = req.body.quantity || 1; // default to 1 seat

//     const event = await eventModel.findById(eventId);

//     if (!event) {
//       return res.status(404).json({ message: "Event not found" });
//     }

//     //  const user = await userModel.findById(userId); // <-- fetch user here
//     // if (!user) {
//     //   return res.status(404).json({ message: "User not found" });
//     // }

//     const availableSeats = event.numberOfSeats - event.bookedSeats;

//     if (availableSeats < quantity) {
//       return res.status(400).json({ message: `Only ${availableSeats} seats left` });
//     }

//     // Update booked seats
//     event.bookedSeats += quantity;
//     await event.save();

//     // Create ticket
//     const ticket = await ticketModel.create({
//       eventId,
//       userId,
//       //  stateId: user.stateId._id,
//       // cityId: user.cityId._id,
//       organizerId: event.organizerId, // optional
//       quantity
//     });

//     res.status(200).json({
//       message: "Seat(s) booked successfully",
//       data: {
//         ticket,
//         event
//       }
//     });
//   } catch (err) {
//     console.error("Error booking seat:", err);
//     res.status(500).json({ message: "Internal Server Error", error: err.message });
//   }
// };

const getTicketsByUser = async (req, res) => {
  try {
    const tickets = await ticketModel.find({ userId: req.params.userId }).populate('eventId').populate('userId', 'name email')
    .populate("stateId", "name") // only get state name
      .populate("cityId", "name"); 
    res.status(200).json({ data: tickets });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
 




module.exports = {
    addEventWithFile,
    getAllEvents,
    updateEvent,
    deleteEvent,
    getEventByUserId,
    getEventById,
    getStats,
    getEventStats,
    bookSeat,
    getTicketsByUser,
    
}