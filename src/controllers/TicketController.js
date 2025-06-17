const ticketModel = require("../models/TicketModal");

const getTicketsByOrganizer = async (req, res) => {
  try {
    const tickets = await ticketModel.find({ organizerId: req.params.organizerId })
       .populate("eventId", "name")       // Fetch event name
      .populate("userId", "fullName email") // Optional: show who booked it
      .populate("stateId", "name")       // State name
      .populate("cityId", "name");       // City name ← semicolon was missing here

  

      // .populate("userId", "fullName email") // Only fetch user name and email
      // .populate("stateId", "name")
      // .populate("cityId", "name")
 
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


module.exports = {
  getTicketsByOrganizer
};
