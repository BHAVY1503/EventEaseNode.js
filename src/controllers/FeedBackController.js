const Feedback = require('../models/FeedBackModel');

// POST /feedbacks - Add new feedback
const createFeedback = async (req, res) => {
  try {
    const { userName, message, profileImage } = req.body;

    if (!userName || !message) {
      return res.status(400).json({ message: "userName and message are required." });
    }

    const feedback = new Feedback({ userName, message, profileImage });
    await feedback.save();

    res.status(201).json({ message: "Feedback submitted successfully", data: feedback });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit feedback", error: err.message });
  }
};

// GET /feedbacks - Fetch all feedbacks
const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }); // recent first
    res.status(200).json({ message: "Feedbacks fetched", data: feedbacks });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch feedbacks", error: err.message });
  }
};

module.exports = {
  createFeedback,
  getAllFeedbacks,
};
