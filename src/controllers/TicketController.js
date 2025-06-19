const ticketModel = require("../models/TicketModal");

const getTicketsByOrganizer = async (req, res) => {
  try {
    const rawTickets = await ticketModel.find({ organizerId: req.params.organizerId })
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
    const tickets = await ticketModel.find({ userId: req.params.userId })
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


module.exports = {
  getTicketsByOrganizer,
  getTicketsByUser
};
