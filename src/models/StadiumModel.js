const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema({
//   name: { type: String, required: true },     // Zone A, B, etc.
  seatLabels: [{ type: String, required: true }], // ['A1', 'A2', ..., 'A10']
   price: { type: Number, required: true } 
});

const stadiumSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalSeats: { type: Number, required: true },
  location: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },

  zones: [zoneSchema],
  
   organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "organizer",
    // required: true,
  },

imageUrl: { type: String },
}, { timestamps: true, collection: "stadiums" });

module.exports = mongoose.model("Stadium", stadiumSchema);
