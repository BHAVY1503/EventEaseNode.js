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
  },
  ticketRate: {
  type: Number,
  required: true,
},

  selectedSeats: {
  type: [String],
  default: [],
},

status: {
  type: String,
  enum: ["Active", "Cancelled", "Refunded"],
  default: "Active",
},

cancellationReason: {
  type: String,
  default: "",
},

cancellationDate: {
  type: Date,
},

refundAmount: {
  type: Number,
  default: 0,
},

refundStatus: {
  type: String,
  enum: ["Pending Approval", "Pending", "Processing", "Completed", "Rejected", "No Refund"],
  default: "Pending Approval"
},

adminApproval: {
  type: String,
  enum: ["Pending", "Approved", "Rejected"],
  default: "Pending"
},

adminRemark: {
  type: String,
  default: ""
},

 adminActionDate: {
    type: Date,
    default: null
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

refundTransactionId: {
  type: String,
  default: ""
},

refundDate: {
  type: Date,
}
},{ timestamps: true });

module.exports = mongoose.model("ticket", ticketSchema);
