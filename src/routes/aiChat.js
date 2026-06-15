const express = require("express");
const router = express.Router();

const { askGemini } = require("../services/geminiService");
const detectIntent = require("../utils/detectIntent");
const extractCity = require("../utils/extractCity");
const extractCategory = require("../utils/extractCategory");
const vectorSearchEvents = require("../services/vectorSearch");

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Validate request payload
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ 
        reply: "Please enter a valid message.",
        events: [] 
      });
    }

    // Truncate input message to protect against injection/excessive tokens in production
    const sanitizedMessage = message.trim().slice(0, 500);

    // 1️⃣ Detect intent
    const intent = detectIntent(sanitizedMessage);

    // 👋 GREETING (RETURN EARLY — NO EVENTS)
    if (intent === "GREET") {
      return res.json({
        reply: `1. Hello! 👋 I'm your EventEase assistant.

2. I can help you find events, book tickets, or answer questions about EventEase.

👉 Next, you can:
- Search for events by city
- Ask about booking tickets
- Explore upcoming events`,
        events: []
      });
    }

    // ❓ UNKNOWN MESSAGE
    if (intent === "UNKNOWN") {
      return res.json({
        reply: `1. I'm here to help with EventEase-related questions.

2. Try asking about events, booking tickets, or help topics.

👉 Next, you can:
- Say "show events in Surat"
- Ask "how to book tickets"
- Browse upcoming events`,
        events: []
      });
    }

    // 2️⃣ Extract filters (only if needed)
    const city = extractCity(sanitizedMessage);
    const category = extractCategory(sanitizedMessage);

    let events = [];

    // 3️⃣ Fetch events ONLY for BROWSE / BOOK
    if (intent === "BROWSE" || intent === "BOOK") {
      events = await vectorSearchEvents(sanitizedMessage, city, category);
    }

    // 4️⃣ Ask Gemini
    const aiReply = await askGemini(sanitizedMessage, events);

    // 5️⃣ Standardized Response
    res.json({
      reply: aiReply,
      events
    });

  } catch (error) {
    console.error("Chatbot router error:", error);
    res.status(500).json({
      reply: "Something went wrong. Please try again later.",
      events: []
    });
  }
});

module.exports = router;
