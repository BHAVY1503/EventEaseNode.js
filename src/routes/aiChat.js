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

    // 1️⃣ Detect intent
    const intent = detectIntent(message);

    // 👋 GREETING (RETURN EARLY — NO EVENTS)
    if (intent === "GREET") {
      return res.json({
        // intent,
        reply: `1. Hello! 👋 I'm your EventEase assistant.

        2. I can help you find events, book tickets, or answer questions about EventEase.

       👉 Next, you can:
       - Search for events by city
       - Ask about booking tickets
       - Explore upcoming events`
      });
    }

    // ❓ UNKNOWN MESSAGE
    if (intent === "UNKNOWN") {
      return res.json({
        // intent,
        reply: `1. I'm here to help with EventEase-related questions.

         2. Try asking about events, booking tickets, or help topics.

         👉 Next, you can:
         - Say "show events in Surat"
         - Ask "how to book tickets"
         - Browse upcoming events`
          });
        }

    // 2️⃣ Extract filters (only if needed)
    const city = extractCity(message);
    const category = extractCategory(message);

    let events = [];

    // 3️⃣ Fetch events ONLY for BROWSE / BOOK
    if (intent === "BROWSE" || intent === "BOOK") {
      events = await vectorSearchEvents(message, city, category);
    }

    // 4️⃣ Ask Gemini
    const aiReply = await askGemini(message, events, intent);

    res.json({
      // intent,
      // reply: aiReply
      message: aiReply,
      events
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Something went wrong."
    });
  }
});

module.exports = router;



// const express = require("express");
// const router = express.Router();
// const { askGemini } = require("../services/geminiService");

// // OPTIONAL: auth middleware if you want only logged-in users
// // const requireAuth = require("../middleware/requireAuth");

// router.post("/chat", async (req, res) => {
//   try {
//     const { message } = req.body;

//     if (!message) {
//       return res.status(400).json({ error: "Message is required" });
//     }

//     const reply = await askGemini(message);
//     res.json({ reply });
//   } catch (error) {
//     console.error("AI error:", error);
//     res.status(500).json({ error: "AI service error" });
//   }
// });

// module.exports = router;
