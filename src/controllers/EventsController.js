const eventModel = require("../models/EventsModel")
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

const getAllEvents = async(req,res)=>{
   try{
    const allEvents = await eventModel.find().populate("stateId cityId")
    if(allEvents.length === 0){
        res.status(404).json({
            message:"Events not found.. ",
        })
    }else{
      res.status(200).json({
        message:"Events found successfully",
        data:allEvents
      })
    }
   }catch(err){
    res.status(500).json({
        message:err.message
    })
   }
    
}

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

const getEventByUserId = async(req,res)=>{
  try{
    const allevent = await eventModel.find({userId:req.params.userId}).populate("stateId cityId userId")
    if (allevent.length === 0) {
        res.status(404).json({ message: "No event found" });
      } else {
        res.status(200).json({
          message: "event found successfully",
          data: allevent,
        })
    }
    
  }catch(err){
    res.status(500).json({
    message:err
    })
    
  }
}

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



module.exports = {
    addEventWithFile,
    getAllEvents,
    updateEvent,
    deleteEvent,
    getEventByUserId,
    getEventById
}