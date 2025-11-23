const eventModel = require("../models/EventsModel")
const ticketModel = require("../models/TicketModal")
const stadiumModel = require("../models/StadiumModel")
// const userModel = require("../models/UserModel")
const userModel = require("../models/UserModel")
const Organizer = require("../models/OrganizerModel");


const mongoose = require("mongoose");
const { sendingMail } = require("../utils/MailUtils");

const multer = require("multer") //for uploading files
const path = require("path")
const fs = require("fs");
const nodemailer = require("nodemailer");
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');
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

       // ✅ Add approval system logic
    if (req.user.role === "Organizer") {
      req.body.isApproved = false;
      req.body.approvalStatus = "Pending";
    }

    if (req.user.role === "Admin") {
      req.body.isApproved = true;
      req.body.approvalStatus = "Approved";
      req.body.isAdminEvent = true;
    }

     //  Mark Admin events
    // if (req.user.role === "Admin") {
    //   req.body.isAdminEvent = true;
    // }

    //  Handle zonePrices override for Indoor events
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

if (req.body.eventCategory === "ZoomMeeting") {
    // Remove stateId and cityId
    req.body.stateId = undefined;
    req.body.cityId = undefined;

    // Ensure Zoom URL is provided
    if (!req.body.zoomUrl) {
        return res.status(400).json({ message: "Zoom URL is required for ZoomMeeting" });
    }
} else {
    // For Indoor/Outdoor events, make sure empty state/city fields are undefined
    if (!req.body.stateId) req.body.stateId = undefined;
    if (!req.body.cityId) req.body.cityId = undefined;
}

const savedEvent = await eventModel.create(req.body);

// 🔔 SEND NOTIFICATION TO ADMINS WHEN ORGANIZER CREATES EVENT
if (req.user.role === "Organizer" && savedEvent.approvalStatus === "Pending") {
  try {
    // Fetch all admin users
    const admins = await userModel.find({}).populate('roleId');
    
    // Filter users who have Admin role
    const adminUsers = admins.filter(user => 
      user.roleId && (user.roleId.name === "Admin" || user.roleId.name === "admin")
    );

    const adminEmails = adminUsers.map(admin => admin.email).filter(Boolean);

    if (adminEmails.length > 0) {
      const organizer = await userModel.findById(req.user._id);
      // const organizerName = organizer.fullName || organizer.name || "Organizer";
      const organizerData = await userModel.findById(req.user._id);
      const organizerName = organizerData?.fullName || organizerData?.name || "Organizer";

      // const organizerName = req.user.fullName || req.user.name || "Organizer";
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/admin';

      await sendingMail(
        adminEmails.join(','),
        "🆕 New Event Pending Approval - EventEase",
        `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px;">🆕 New Event Requires Approval</h2>
              
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #2563eb; margin-top: 0;">${savedEvent.eventName}</h3>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Type:</strong> ${savedEvent.eventType}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Category:</strong> ${savedEvent.eventCategory}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Organizer:</strong> ${organizerName}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Start Date:</strong> ${new Date(savedEvent.startDate).toLocaleDateString()}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Seats:</strong> ${savedEvent.numberOfSeats}</p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${frontendUrl}/admin#groupbyevent" 
                   style="background: linear-gradient(135deg, #dc2626 0%, #9333ea 100%); 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          font-weight: bold;
                          display: inline-block;">
                  Review Event Now
                </a>
              </div>

              <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                This is an automated notification from EventEase Admin Panel.
              </p>
            </div>
          </div>
        `
      );

      console.log(`✅ Admin notification email sent to ${adminEmails.length} admin(s)`);
    } else {
      console.log("⚠️ No admin emails found");
    }
  } catch (emailErr) {
    console.error("❌ Failed to send admin notification:", emailErr.message);
  }
}

res.status(200).json({
  message: req.user.role === "Organizer" 
    ? "Event added successfully! Admin will review your event soon." 
    : "Event added successfully!",
  data: savedEvent,
}); 
  } catch (err) {
    console.error("Error uploading event:", err);
    res.status(500).json({ message: err.message });
  }
};
//     const savedEvent = await eventModel.create(req.body);

//     res.status(200).json({
//       message: "Event added successfully",
//       data: savedEvent,
//     });
//   } catch (err) {
//     console.error("Error uploading event:", err);
//     res.status(500).json({ message: err.message });
//   }
// };



const getAllEvents = async (req, res) => {
  try {
    const allEvents = await eventModel
      .find({ isApproved: true, approvalStatus: "Approved" })
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

      // Validate ObjectId fields
    const objectIdFields = ["stadiumId", "stateId", "cityId", "organizerId"];
    objectIdFields.forEach((field) => {
      if (updateData[field] === "undefined" || !updateData[field] || !mongoose.Types.ObjectId.isValid(updateData[field])) {
        delete updateData[field];
      }
    });

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
    const userRole = req.user.role;

    // Step 1: Find the event
    const event = await eventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Step 2: Check if this organizer owns the event
    // if (event.organizerId.toString() !== organizerId.toString()) {
    //   return res.status(403).json({ message: "Unauthorized: You can't delete this event" });
    // }
      // Allow: organizer who created OR admin
    if (event.organizerId.toString() !== organizerId.toString() && userRole !== "Admin") {
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

    // 1️⃣ Fetch logged user based on role
let loggedUser;

if (req.user.role === "User") {
  loggedUser = await userModel.findById(req.user._id);
} 
else if (req.user.role === "Organizer") {
  loggedUser = await Organizer.findById(req.user._id);
} 
else {
  return res.status(403).json({ message: "Invalid role for booking" });
}

if (!loggedUser) {
  return res.status(404).json({ message: "Account not found" });
}

// 2️⃣ Ensure verified account
if (!loggedUser.isVerified) {
  return res.status(403).json({ message: "Please verify your email first" });
}

// 3️⃣ Continue seat booking...

    // const loggedUser = await userModel.findById(userId);
    // if (!loggedUser.isVerified) {
    //   return res.status(403).json({
    //     message: "Please verify your email before booking tickets."
    //   });
    // }

    // Step 1: Fetch event
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

    // Step 5: Calculate ticket price - FIXED VERSION
    let perTicketRate = 0;
    let totalPrice = 0;

    if (event.eventCategory === "Indoor" && selectedSeats.length > 0) {
      // Indoor: Calculate total from zone prices
      const zones = event.customZones || [];
      for (const zone of zones) {
        const zoneSeats = zone.seatLabels || [];
        const seatsInZone = selectedSeats.filter(seat => zoneSeats.includes(seat));
        totalPrice += seatsInZone.length * zone.price;
        console.log(`Zone: ${zone.zoneName || "Unnamed"}, Price: ${zone.price}, Seats matched:`, seatsInZone);
      }
      // Calculate average per-ticket rate
      perTicketRate = quantity > 0 ? totalPrice / quantity : 0;
      console.log(`Indoor - Total: ${totalPrice}, Per ticket: ${perTicketRate}, Qty: ${quantity}`);
    } else {
      // Outdoor/Zoom: Use event's base rate
      perTicketRate = event.ticketRate || 0;
      totalPrice = perTicketRate * quantity;
      console.log(`Outdoor/Zoom - Rate: ${perTicketRate}, Qty: ${quantity}, Total: ${totalPrice}`);
    }

    // Step 6: Update event booking data
    event.bookedSeats += quantity;
    event.bookedSeatLabels.push(...selectedSeats);
    if (event.bookedSeats > event.numberOfSeats) {
      return res.status(400).json({ message: "Cannot exceed total seat capacity" });
    }
    await event.save();

    // Step 7: Create ticket - STORE PER-TICKET RATE
    const ticket = await ticketModel.create({
      eventId,
      userId,
      stateId,
      cityId,
      selectedSeats,
      stadiumId,
      organizerId: event.organizerId,
      quantity,
      ticketRate: perTicketRate, // Store per-ticket rate for invoice
      paymentId: req.body.paymentId || undefined
    });

    console.log(`✅ Ticket created: ID=${ticket._id}, PerTicketRate=${perTicketRate}, Qty=${quantity}, Total=${totalPrice}`);

    // Step 8: Send email - FIXED to use perTicketRate and totalPrice
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

      // Replace the htmlContent section in your bookSeat function with this:

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
    .header::before { content: "🎉"; position: absolute; font-size: 100px; opacity: 0.1; top: -20px; right: -20px; }
    .header::after { content: "🎊"; position: absolute; font-size: 80px; opacity: 0.1; bottom: -10px; left: -10px; }
    .logo { font-size: 32px; font-weight: bold; color: #ffffff; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
    .header-subtitle { color: #e0e7ff; font-size: 18px; margin-top: 10px; font-weight: 600; }
    .ticket-banner { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 24px; color: #111827; margin-bottom: 15px; font-weight: 700; }
    .message { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
    .event-card { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 16px; padding: 25px; margin: 25px 0; border: 2px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .event-title { font-size: 22px; color: #6366f1; margin: 0 0 20px 0; font-weight: bold; display: flex; align-items: center; }
    .event-title::before { content: "🎭"; margin-right: 10px; font-size: 24px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px dashed #d1d5db; align-items: center; }
    .detail-row:last-child { border-bottom: none; }
    .detail-icon { font-size: 20px; margin-right: 12px; min-width: 25px; }
    .detail-label { color: #6b7280; font-weight: 500; flex: 1; }
    .detail-value { color: #111827; font-weight: 600; text-align: right; }
    .seats-box { background: white; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .seats-title { color: #6366f1; font-weight: 700; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .seats-list { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 15px; }
    .seat-badge { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(99,102,241,0.3); }
    .pricing-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 5px solid #f59e0b; }
    .price-row { display: flex; justify-content: space-between; padding: 10px 0; }
    .price-label { color: #78350f; font-weight: 600; font-size: 15px; }
    .price-value { color: #78350f; font-weight: 700; font-size: 15px; }
    .total-row { border-top: 2px solid #f59e0b; padding-top: 15px; margin-top: 10px; }
    .total-label { font-size: 18px; color: #78350f; font-weight: 700; }
    .total-value { font-size: 24px; color: #78350f; font-weight: 900; }
    .venue-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; box-shadow: 0 4px 6px rgba(99,102,241,0.4); transition: transform 0.2s; }
    .venue-button:hover { transform: translateY(-2px); }
    .qr-section { text-align: center; padding: 25px; background: #f9fafb; border-radius: 12px; margin: 25px 0; }
    .qr-text { color: #6b7280; font-size: 14px; margin-top: 15px; }
    .divider { height: 2px; background: linear-gradient(90deg, transparent, #6366f1, transparent); margin: 30px 0; }
    .tips-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .tips-title { color: #1e40af; font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; }
    .tips-title::before { content: "💡"; margin-right: 8px; }
    .tips-list { color: #1e40af; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px; }
    .footer { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 35px 30px; text-align: center; color: #9ca3af; }
    .footer-logo { font-size: 24px; font-weight: bold; color: #ffffff; margin-bottom: 15px; }
    .social-links { margin: 20px 0; }
    .social-links a { color: #6366f1; text-decoration: none; margin: 0 12px; font-weight: 600; }
    .footer-text { font-size: 13px; line-height: 1.6; }
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px; }
      .header { padding: 30px 20px; }
      .event-card { padding: 20px; }
      .seats-list { gap: 6px; }
      .seat-badge { padding: 6px 12px; font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1 class="logo">🎟️ EventEase</h1>
      <p class="header-subtitle">Your Ticket is Confirmed!</p>
    </div>

    <!-- Success Banner -->
    <div class="ticket-banner">
      ✅ BOOKING CONFIRMED - YOU'RE ALL SET!
    </div>

    <!-- Content -->
    <div class="content">
      <h2 class="greeting">Hey ${user.name || "Valued Guest"}! 🎉</h2>
      
      <p class="message">
        Awesome news! Your ticket(s) for <strong>${event.eventName}</strong> have been successfully booked. 
        Get ready for an unforgettable experience! We can't wait to see you there! 🌟
      </p>

      <!-- Event Details Card -->
      <div class="event-card">
        <h3 class="event-title">${event.eventName}</h3>
        
        <div class="detail-row">
          <span class="detail-icon">📅</span>
          <span class="detail-label">Event Date</span>
          <span class="detail-value">${new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-icon">🕐</span>
          <span class="detail-label">Time</span>
          <span class="detail-value">${new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-icon">📍</span>
          <span class="detail-label">Venue</span>
          <span class="detail-value">${event.location || "To be announced"}</span>
        </div>

        <div class="detail-row">
          <span class="detail-icon">🎫</span>
          <span class="detail-label">Quantity</span>
          <span class="detail-value">${quantity} Ticket${quantity > 1 ? 's' : ''}</span>
        </div>

        ${event.eventCategory === "ZoomMeeting" && event.zoomUrl ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="${event.zoomUrl}" class="venue-button">🎥 Join Zoom Meeting</a>
        </div>
        ` : (event.latitude && event.longitude ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.google.com/maps?q=${event.latitude},${event.longitude}" class="venue-button">📍 Get Directions</a>
        </div>
        ` : '')}
      </div>

      ${selectedSeats.length > 0 ? `
      <!-- Selected Seats -->
      <div class="seats-box">
        <div class="seats-title">🪑 Your Reserved Seats</div>
        <div class="seats-list">
          ${selectedSeats.map(seat => `<span class="seat-badge">${seat}</span>`).join('')}
        </div>
      </div>
      ` : `
      <div class="seats-box">
        <div class="seats-title">🎟️ General Admission</div>
        <p style="color: #6b7280; margin: 10px 0 0 0;">First come, first served seating</p>
      </div>
      `}

      <!-- Pricing Details -->
      <div class="pricing-section">
        <div class="price-row">
          <span class="price-label">Price per Ticket</span>
          <span class="price-value">₹${perTicketRate.toLocaleString()}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Number of Tickets</span>
          <span class="price-value">× ${quantity}</span>
        </div>
        <div class="price-row total-row">
          <span class="total-label">Total Amount</span>
          <span class="total-value">₹${totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Tips Section -->
      <div class="tips-box">
        <div class="tips-title">Important Reminders</div>
        <ul class="tips-list">
          <li>Please arrive at least 30 minutes before the event starts</li>
          <li>Carry a valid photo ID for verification</li>
          <li>Keep this email handy for entry (digital or printed)</li>
          <li>Check the weather forecast and dress accordingly</li>
        </ul>
      </div>

      <!-- QR Section -->
      <div class="qr-section">
        <p style="font-size: 18px; color: #111827; font-weight: 600; margin: 0 0 10px 0;">
          📱 Show This Email at Entry
        </p>
        <p class="qr-text">
          Present this confirmation email at the venue for quick check-in.<br/>
          Need help? Contact our support team anytime!
        </p>
        <a href="mailto:${process.env.EMAIL_USER || 'support@eventease.com'}" class="venue-button" style="margin-top: 15px;">
          📧 Contact Support
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-logo">EventEase</div>
      <p style="color: #d1d5db; margin: 10px 0;">Making Events Easy, One Ticket at a Time</p>
      
      <div class="social-links">
        <a href="#">Facebook</a> • 
        <a href="#">Twitter</a> • 
        <a href="#">Instagram</a> • 
        <a href="#">LinkedIn</a>
      </div>
      
      <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #374151;">
        <p class="footer-text">
          © ${new Date().getFullYear()} EventEase. All rights reserved.<br/>
          This is an automated confirmation email. Please do not reply.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Then use it in the sendingMail call:
    try {
      // Prepare transporter to send email with invoice attachment
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Ensure invoices dir exists
      const invoicesDir = path.join(__dirname, "../../invoices");
      if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

      const invoicePath = path.join(invoicesDir, `invoice_ticket_${ticket._id}.pdf`);

      // Create a stylish PDF invoice
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(invoicePath);
      doc.pipe(writeStream);

      // Branded header
      doc.rect(0, 0, doc.page.width, 110).fill('#0f172a');
      doc.fillColor('white').fontSize(26).font('Helvetica-Bold').text('EventEase', 50, 36);
      doc.fontSize(12).font('Helvetica').fillColor('#e6eef8').text('Ticket Invoice', doc.page.width - 180, 50, { align: 'right' });

      // Invoice meta
      const invoiceId = `INV-${ticket._id.toString().slice(-8).toUpperCase()}`;
      doc.fillColor('#9ca3af').fontSize(9).text(`Invoice ID: ${invoiceId}`, 50, 140);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 154);

      // Customer & Event columns
      const leftX = 50;
      const rightX = doc.page.width / 2 + 10;
      const startY = 180;

      doc.fontSize(11).fillColor('#0f172a').font('Helvetica-Bold').text('Billed To', leftX, startY);
      doc.fontSize(10).font('Helvetica').fillColor('#111827').text(user.fullName || user.name || user.email, leftX, startY + 18);
      doc.fontSize(9).fillColor('#6b7280').text(user.email, leftX, startY + 36);

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Event', rightX, startY);
      doc.fontSize(10).font('Helvetica').fillColor('#111827').text(event.eventName, rightX, startY + 18);
      doc.fontSize(9).fillColor('#6b7280').text(new Date(event.startDate).toLocaleString(), rightX, startY + 36);

      // Selected seats display
      if (Array.isArray(selectedSeats) && selectedSeats.length > 0) {
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Selected Seats', leftX, startY + 80);
        const seatY = startY + 100;
        let offsetX = leftX;
        selectedSeats.forEach((s, idx) => {
          const badgeWidth = 80;
          doc.roundedRect(offsetX, seatY, badgeWidth, 22, 6).fill('#6366f1');
          doc.fillColor('white').fontSize(10).text(String(s), offsetX + 10, seatY + 5);
          offsetX += badgeWidth + 8;
          if (offsetX > doc.page.width - 120) {
            offsetX = leftX;
          }
        });
      }

      // Pricing table
      const tableTop = Array.isArray(selectedSeats) && selectedSeats.length > 0 ? startY + 150 : startY + 120;
      doc.moveTo(50, tableTop).lineTo(doc.page.width - 50, tableTop).stroke('#e5e7eb');
      doc.fontSize(10).fillColor('#6b7280').text('Description', 60, tableTop + 8);
      doc.text('Qty', doc.page.width - 220, tableTop + 8);
      doc.text('Rate', doc.page.width - 140, tableTop + 8);
      doc.text('Amount', doc.page.width - 80, tableTop + 8);

      const descY = tableTop + 30;
      doc.fontSize(10).fillColor('#111827').text('Event Ticket', 60, descY);
      doc.text(String(quantity), doc.page.width - 220, descY);
      doc.text(`₹${perTicketRate.toLocaleString()}`, doc.page.width - 140, descY);
      doc.text(`₹${totalPrice.toLocaleString()}`, doc.page.width - 80, descY);

      // Totals
      const totalsY = descY + 60;
      doc.roundedRect(doc.page.width - 260, totalsY - 10, 200, 70, 6).fill('#f3f4f6');
      doc.fillColor('#374151').fontSize(10).text('Subtotal', doc.page.width - 240, totalsY);
      doc.text(`₹${totalPrice.toLocaleString()}`, doc.page.width - 90, totalsY);
      doc.font('Helvetica-Bold').text('Total Paid', doc.page.width - 240, totalsY + 24);
      doc.text(`₹${totalPrice.toLocaleString()}`, doc.page.width - 90, totalsY + 24);

      // QR code: embed signed verification URL for this ticket
      try {
        if (ticket && ticket._id) {
          const payload = ticket._id.toString();
          const secret = process.env.QR_SECRET || process.env.RAZORPAY_KEY_SECRET || 'eventease_default_secret';
          const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
          const verifyUrl = `${process.env.APP_URL || 'https://example.com'}/api/verify-ticket/${payload}/${sig}`;
          const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: 'H' });
          const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          const qrX = doc.page.width - 160;
          const qrY = totalsY + 10;
          doc.image(qrBuffer, qrX, qrY, { width: 110 });
          doc.fillColor('#374151').fontSize(9).text('Scan to verify ticket', qrX - 10, qrY + 115, { width: 130, align: 'center' });
        }
      } catch (e) {
        console.warn('Failed to generate QR for invoice:', e.message);
      }

      // Footer message
      doc.fillColor('#9ca3af').fontSize(9).text('We look forward to seeing you at the event. Contact support if you have any questions.', 50, doc.page.height - 120, { width: doc.page.width - 100, align: 'center' });

      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Send mail with invoice attached
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `🎉 Your Tickets for ${event.eventName} are Confirmed!`,
        html: htmlContent.replace(`${user.name || "Valued Guest"}`, `${user.fullName || user.name || user.email}`),
        attachments: [
          {
            filename: `Invoice_${ticket._id}.pdf`,
            path: invoicePath,
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      console.log("✅ Confirmation email with invoice sent to", user.email);

      // Cleanup invoice file after short delay
      setTimeout(() => {
        try {
          fs.unlinkSync(invoicePath);
        } catch (e) {
          console.warn('Failed to delete temp invoice file', invoicePath, e.message);
        }
      }, 30000);
    } catch (emailErr) {
      console.error("❌ Failed to send email/attachment:", emailErr.message);
    }
;}

    //   const htmlContent = `
    //     <h2>🎟️ Ticket Confirmation - ${event.eventName}</h2>
    //     <p>Dear ${user.name || "User"},</p>
    //     <p>Thank you for booking your seat(s) for <strong>${event.eventName}</strong>.</p>
    //     <p><strong>Date:</strong> ${new Date(event.startDate).toDateString()}</p>
    //     <p><strong>Venue:</strong> ${venueInfo}</p>
    //     <p><strong>Selected Seats:</strong> ${selectedSeats.length ? selectedSeats.join(", ") : "General Admission"}</p>
    //     <p><strong>Quantity:</strong> ${quantity}</p>
    //     <p><strong>Price per Ticket:</strong> ₹${perTicketRate.toLocaleString()}</p>
    //     <p><strong>Total Price:</strong> ₹${totalPrice.toLocaleString()}</p>
    //     <br/>
    //     <p>Enjoy the event!</p>
    //     <p>- EventEase Team</p>
    //   `;

    //   try {
    //     await sendingMail(user.email, "Your Ticket Booking Confirmation", htmlContent);
    //     console.log("✅ Confirmation email sent to", user.email);
    //   } catch (emailErr) {
    //     console.error("❌ Failed to send email:", emailErr.message);
    //   }
    // }

    // Step 9: Respond to frontend
    res.status(200).json({
      message: "Seat(s) booked successfully",
      data: { 
        ticket, 
        event,
        pricing: {
          perTicketRate,
          quantity,
          totalPrice
        }
      },
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
          events: { $push: "$$ROOT" }, // Push entire event document
        },
      },
      {
        $lookup: {
          from: "organizers", // Your organizer collection name
          localField: "_id",
          foreignField: "_id",
          as: "organizerInfo",
        },
      },
      { $unwind: "$organizerInfo" },
      {
        $project: {
          organizerName: "$organizerInfo.name",
          organizerEmail: "$organizerInfo.email",
          events: 1,
        },
      },
    ]);

    // ✅ Populate stadium, state, and city references
    const populatedGroups = await eventModel.populate(groupedEvents, [
      { path: "events.stadiumId", select: "name location" },
      { path: "events.stateId", select: "Name" },
      { path: "events.cityId", select: "name" },
    ]);

    res.status(200).json({ success: true, data: populatedGroups });
  } catch (error) {
    console.error("Error grouping events:", error);
    res.status(500).json({ success: false, message: "Failed to group events", error });
  }
};


const getAdminEvents = async (req, res) => {
  try {
    const adminEvents = await eventModel
      .find({ isAdminEvent: true })
      .populate("stateId", "Name")
      .populate("cityId", "name")
      .populate("stadiumId")
      .populate("organizerId", "name email"); // optional

    if (adminEvents.length === 0) {
      return res.status(404).json({ message: "No Admin events found" });
    }

    res.status(200).json({
      success: true,
      data: adminEvents,
    });
  } catch (err) {
    console.error("Error fetching Admin events:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


const getAllEventsForAdmin = async (req, res) => {
  try {
    const allEvents = await eventModel
      .find()
      .populate("stateId cityId organizerId stadiumId");

    res.status(200).json({
      message: "All events (admin view)",
      data: allEvents,
    });
  } catch (err) {
    console.error("Error in getAllEventsForAdmin:", err);
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const updatedEvent = await eventModel.findByIdAndUpdate(
      eventId,
      { isApproved: true, approvalStatus: "Approved" },
      { new: true }
    );

    if (!updatedEvent)
      return res.status(404).json({ message: "Event not found" });

    const organizer = await Organizer.findById(updatedEvent.organizerId);

    if (organizer?.email) {
      try {
        await sendingMail(
          organizer.email,
          "Your Event Has Been Approved!",
          `<p>Hello <strong>${organizer.name}</strong>,</p>
           <p>Your event "<strong>${updatedEvent.eventName}</strong>" has been <span style="color:green;">approved</span> by the admin.</p>
           <p>Thanks,<br/>EventEase Team</p>`
        );
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr.message);
      }
    }

    res.status(200).json({
      message: "Event approved successfully",
      data: updatedEvent,
    });
  } catch (err) {
    console.error("Approve Event Error:", err);
    res.status(500).json({ message: err.message });
  }
};


const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body; // <-- receive reason from admin

    const updatedEvent = await eventModel.findByIdAndUpdate(
      eventId,
      { 
        isApproved: false, 
        approvalStatus: "Rejected",
        rejectionReason: reason // <-- store reason
      },
      { new: true }
    );

    if (!updatedEvent)
      return res.status(404).json({ message: "Event not found" });

    // Fetch organizer email
    const organizer = await Organizer.findById(updatedEvent.organizerId);
    if (organizer?.email) {
      try {
        await sendingMail(
          organizer.email,
          "Your Event Has Been Rejected",
          `<p>Hello <strong>${organizer.name}</strong>,</p>
           <p>Your event "<strong>${updatedEvent.eventName}</strong>" has been <span style="color:red;">rejected</span> by the admin.</p>
           <p><strong>Reason:</strong> ${reason || "No reason provided"}</p>
           <p>Please contact support for more details.</p>
           <p>Thanks,<br/>EventEase Team</p>`
        );
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr.message);
      }
    }

    res.status(200).json({
      message: "Event rejected successfully and email sent",
      data: updatedEvent,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    getEventsGroupedByOrganizer,
    getAdminEvents,
    getAllEventsForAdmin,
    approveEvent,
    rejectEvent,
    
}