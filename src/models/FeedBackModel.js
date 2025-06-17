const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
    default: "", // Or set a default image URL
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
