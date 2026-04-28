const categories = {
  "Music consert": [
    "music",
    "concert",
    "dj",
    "song",
    "band",
    "live music"
  ],

  "Conference": [
    "conference",
    "tech",
    "technology",
    "developer",
    "coding",
    "seminar",
    "summit"
  ],

  "Exhibition": [
    "exhibition",
    "expo",
    "fair",
    "showcase"
  ],

  "Gala Dinner": [
    "gala",
    "dinner",
    "award",
    "ceremony"
  ],

  "Meeting": [
    "meeting",
    "business meet",
    "corporate meet"
  ],

  "ZoomMeeting": [
    "online",
    "zoom",
    "virtual",
    "webinar"
  ]
};

function extractCategory(message) {
  const text = message.toLowerCase();

  for (const category in categories) {
    if (categories[category].some(word => text.includes(word))) {
      return category; // returns EXACT eventType
    }
  }

  return null;
}

module.exports = extractCategory;


