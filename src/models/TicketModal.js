const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "event", // Match your event model name
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user", // Match your user model name
    required: true
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "organizer",
    // required: true
  },
  stateId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"state",
  },
  cityId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"city",
  },
  quantity: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ticket", ticketSchema);
