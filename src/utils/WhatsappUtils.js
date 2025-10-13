const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER; // default: +14155238886 for sandbox

const client = twilio(accountSid, authToken);

const sendWhatsApp = async (toNumber, message) => {
  return client.messages.create({
    from: whatsappFrom,
    to: `whatsapp:${toNumber}`,
    body: message,
  });
};

module.exports = { sendWhatsApp };
