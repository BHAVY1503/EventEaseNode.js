function detectIntent(message) {
  const text = message.toLowerCase().trim();

  // 👋 GREET intent
  if (
    text === "hi" ||
    text === "hello" ||
    text === "hey" ||
    text === "hey there"||
    text === "hii"||
    text === "helloo"||
    text === "heyy"||
    text === "hyy"||
    text.includes("good morning") ||
    text.includes("good evening")
  ) {
    return "GREET";
  }

  // 🎟️ BOOK intent
  if (
    text.includes("book") ||
    text.includes("buy") ||
    text.includes("ticket") ||
    text.includes("reserve")
  ) {
    return "BOOK";
  }

  // 🆘 HELP intent
  if (
    text.includes("how") ||
    text.includes("help") ||
    text.includes("cancel") ||
    text.includes("refund") ||
    text.includes("support")
  ) {
    return "HELP";
  }

  // 🔍 BROWSE intent (only when user actually asks)
  if (
    text.includes("event") ||
    text.includes("show") ||
    text.includes("find") ||
    text.includes("near") ||
    text.includes("in ")
  ) {
    return "BROWSE";
  }

  // ❓ UNKNOWN / SMALL TALK
  return "UNKNOWN";
}

module.exports = detectIntent;




// function detectIntent(message) {
//   const text = message.toLowerCase();

//   // BOOK intent
//   if (
//     text.includes("book") ||
//     text.includes("buy") ||
//     text.includes("ticket") ||
//     text.includes("reserve")
//   ) {
//     return "BOOK";
//   }

//   // HELP intent
//   if (
//     text.includes("how") ||
//     text.includes("help") ||
//     text.includes("cancel") ||
//     text.includes("refund") ||
//     text.includes("support")
//   ) {
//     return "HELP";
//   }

//   // Default = BROWSE
//   return "BROWSE";
// }

// module.exports = detectIntent;
