const ticketModel = require("../models/TicketModal");

const getTicketsByOrganizer = async (req, res) => {
  try {

    //  Ensure organizer is only accessing their own data
    // if (req.user._id !== req.params.organizerId) {
    //   return res.status(403).json({ message: "Unauthorized: You can only access your own tickets." });
    // }
   const organizerId = req.user._id
  

    const rawTickets = await ticketModel.find({ organizerId: organizerId })
       .populate("eventId")       // Fetch event name
      .populate("userId") // Optional: show who booked it
      .populate("stateId", "Name")       // State name
      .populate("cityId", "name")       // City name ← semicolon was missing here
      .populate("organizerId")
  
       // Filter out tickets whose event was deleted
    const tickets = rawTickets.filter(ticket => ticket.eventId);

    res.status(200).json({
      message: "Tickets fetched successfully",
      data: tickets
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error while fetching tickets",
      error: err.message
    });
  }
};

const getTicketsByUser = async (req, res) => {
  try {

  //   if (req.user._id !== req.params.userId) {
  //   return res.status(403).json({ message: "You can only access your own tickets" });
  // }

  const userId = req.user._id

    const tickets = await ticketModel.find({ userId: userId })
      .populate("eventId", "eventName startDate")
      .populate("organizerId", "name")
      .populate("stateId", "Name")
      .populate("cityId", "name");

    res.status(200).json({
      message: "User tickets fetched successfully",
      data: tickets
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching user tickets",
      error: err.message
    });
  }
};


const getAllTicketsGroupedByEvent = async (req, res) => {
  try {
    const tickets = await ticketModel.find()
      .populate("eventId")
      .populate("userId")
      .populate("stateId")
      .populate("cityId");

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tickets", error });
  }
};


module.exports = {
  getTicketsByOrganizer,
  getTicketsByUser,
  getAllTicketsGroupedByEvent
};
