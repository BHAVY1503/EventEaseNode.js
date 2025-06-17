const express = require('express');
const routes = express.Router();
const feedbackController = require("../controllers/FeedBackController")
// const { createFeedback, getAllFeedbacks } = require('../controllers/feedbackController');

// POST: /feedbacks
routes.post('/feedbacks',feedbackController.createFeedback);

// GET: /feedbacks
routes.get('/feedbacks', feedbackController.getAllFeedbacks);

module.exports = routes;
