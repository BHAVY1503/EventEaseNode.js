const cron = require("node-cron");
const eventModel = require("../models/EventsModel");
const ticketModel = require("../models/TicketModal");
const userModel = require("../models/UserModel");
const { sendingMail } = require("../utils/MailUtils");

// Runs every day at 9 AM server time
cron.schedule("0 9 * * *", async () => {
  console.log("🕘 Running daily reminder job...");

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get events happening tomorrow
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    const eventsTomorrow = await eventModel.find({
      startDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
    });

    if (eventsTomorrow.length === 0) {
      console.log("📭 No events starting tomorrow.");
      return;
    }

    for (const event of eventsTomorrow) {
      // Find users who booked this event
      const tickets = await ticketModel.find({ eventId: event._id }).populate("userId");

      for (const ticket of tickets) {
        const user = ticket.userId;
        if (!user || !user.email) continue;

        const htmlContent = `
          <h2>🎉 Reminder: ${event.eventName} is tomorrow!</h2>
          <p>Dear ${user.name || "User"},</p>
          <p>This is a friendly reminder that your event <strong>${event.eventName}</strong> will start on:</p>
          <p><strong>${new Date(event.startDate).toLocaleString()}</strong></p>
          <p><strong>Venue:</strong> ${event.location || "See event details"}</p>
          <p>We can’t wait to see you there!</p>
          <br/>
          <p>- EventEase Team</p>
        `;

        try {
          await sendingMail(user.email, `Reminder: ${event.eventName} is tomorrow!`, htmlContent);
          console.log(`✅ Reminder sent to ${user.email} for event ${event.eventName}`);
        } catch (err) {
          console.error(`❌ Failed to send reminder to ${user.email}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error running reminder job:", err.message);
  }
});
