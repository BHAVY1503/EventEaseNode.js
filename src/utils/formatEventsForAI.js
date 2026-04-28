function formatEventsForAI(events) {
  if (!events || events.length === 0) {
    return "No matching events found on EventEase.";
  }

  return events
    .map(
      (event, index) => `
${index + 1}.

Event Name: ${event.eventName}

Type: ${event.eventType}

City: ${event.cityId?.name || "N/A"}

Start Date: ${new Date(event.startDate).toDateString()}

End Date: ${new Date(event.endDate).toDateString()}

Price: ₹${event.ticketRate || 0}

Location: ${event.location || "Not specified"}
`
    )
    .join("\n");
}

module.exports = formatEventsForAI;




// function formatEventsForAI(events) {
//   if (!events || events.length === 0) {
//     return "No matching events found on EventEase.";
//   }

//   return events.map((event, index) => `
// ${index + 1}.
// Event Name: ${event.eventName}
// Type: ${event.eventType}
// City: ${event.cityId?.name || "N/A"}
// Start Date: ${new Date(event.startDate).toDateString()}
// End Date: ${new Date(event.endDate).toDateString()}
// Price: ₹${event.ticketRate || 0}
// Location: ${event.location || "Not specified"}
// `).join("\n");
// }

// module.exports = formatEventsForAI;
 


