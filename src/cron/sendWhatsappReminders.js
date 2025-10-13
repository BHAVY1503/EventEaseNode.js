const cron = require("node-cron");
const ticketModel = require("../models/TicketModal");
const eventModel = require("../models/EventsModel");
const userModel = require("../models/UserModel");
const moment = require("moment");
const { sendWhatsApp } = require("../utils/WhatsappUtils");

// Run at 10:00 AM daily
cron.schedule("0 10 * * *", async () => {
  const tomorrow = moment().add(1, "day").startOf("day");
  const dayAfter = moment().add(2, "day").startOf("day");

  try {
    const events = await eventModel.find({
      startDate: { $gte: tomorrow.toDate(), $lt: dayAfter.toDate() },
    });

    for (const event of events) {
      const tickets = await ticketModel
        .find({ eventId: event._id })
        .populate("userId");

      for (const ticket of tickets) {
        const user = ticket.userId;
        if (!user?.phoneNumber) continue;

        const seats = ticket.selectedSeats?.join(", ") || "General Admission";
        const venue = event.eventCategory === "ZoomMeeting"
          ? `Zoom Link: ${event.zoomUrl}`
          : `Venue: ${event.location?.address || "Check Event Page"}`;

        const message = `📢 Reminder for ${user.name || "Guest"}:\nYour event "${event.eventName}" is happening tomorrow!\n\n📅 Date: ${moment(event.startDate).format("DD MMM YYYY")}\n🪑 Seats: ${seats}\n${venue}\n\nHave a great time!\n- EventEase`;

        try {
          await sendWhatsApp(user.phoneNumber, message);
          console.log(`✅ WhatsApp sent to ${user.phoneNumber}`);
        } catch (err) {
          console.error(`❌ WhatsApp failed for ${user.phoneNumber}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("❌ Cron Job Error:", err.message);
  }
});
