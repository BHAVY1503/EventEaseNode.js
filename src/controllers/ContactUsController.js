const contactusModel = require("../models/ContactUsModel");
const { sendingMail } = require("../utils/MailUtils");

const sendMessage = async (req, res) => {
  try {
    const { name, company, email, phoneNo, eventType, question, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Name, email, and message are required.",
      });
    }

    // Detect sender role (if logged in)
    const senderRole = req.user?.role || "Guest";

    const savedMessage = await contactusModel.create({
      name,
      company,
      email,
      phoneNo,
      eventType,
      question,
      message,
      senderRole,
    });

    // ✅ Send email notification to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@eventease.com";
      const subject = `📩 New Contact Message from ${name}`;
      const htmlContent = `
        <h2>New Contact Message Received</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Role:</strong> ${senderRole}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Phone:</strong> ${phoneNo || "N/A"}</p>
        <p><strong>Event Type:</strong> ${eventType || "N/A"}</p>
        <p><strong>Heard About Us:</strong> ${question || "N/A"}</p>
        <p><strong>Message:</strong><br/>${message}</p>
        <br/>
        <p>✅ Please respond to this user at <a href="mailto:${email}">${email}</a></p>
      `;
      await sendingMail(adminEmail, subject, htmlContent);
      console.log("📧 Admin notified successfully.");
    } catch (mailErr) {
      console.error("❌ Failed to send admin email:", mailErr.message);
    }

    res.status(201).json({
      message: "Message sent successfully.",
      data: savedMessage,
    });
  } catch (err) {
    console.error("❌ Error while sending message:", err);
    res.status(500).json({ message: err.message });
  }
};

const getMessage = async (req, res) => {
  try {
    const messages = await contactusModel.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  sendMessage,
  getMessage,
};




// const contactusModel = require("../models/ContactUsModel")

// const sendMessage = async(req,res)=>{
//     try{
//     const message = await contactusModel.create(req.body) 
    
//     res.status(201).json({
//         message:"mesaage send successfully..",
//         data:message
//     })
// }catch(err){
//     console.error("error while sending message..",err),
//     res.status(500).json({
//         message:err.message
//     })
// }
// }

// const getMessage = async(req,res)=>{
//     try{
//         const message = await contactusModel.find()
//         res.status(200).json({
//             message:"message found successfully",
//             data:message
//         })
//     }catch(err){
//         console.error("error to found message..",err),
//         res.status(500).json({
//             message:err.message
//         })
//     }
// }

// module.exports = {
//     sendMessage,
//     getMessage
// }