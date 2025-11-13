const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  organizerId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'organizer'

  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'event',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    // required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
   updatedAt: {
     type: Date },
});

module.exports = mongoose.model('payment', paymentSchema);