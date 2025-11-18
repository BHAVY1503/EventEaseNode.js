// TicketController.js - Complete Updated Version
const ticketModel = require("../models/TicketModal");
const PDFDocument = require('pdfkit');
const eventModel = require("../models/EventsModel");
const { sendingMail } = require("../utils/MailUtils"); // if you have this util
const PaymentModel = require("../models/PaymentModel"); // to verify paymentId if present
// Existing methods
const getTicketsByOrganizer = async (req, res) => {
  try {
    const organizerId = req.user._id;

    const rawTickets = await ticketModel.find({ organizerId: organizerId })
      .populate("eventId")
      .populate("userId")
      .populate("stateId", "Name")
      .populate("cityId", "name")
      .populate("organizerId");

    // Filter out tickets whose event was deleted
    const tickets = rawTickets.filter(ticket => ticket.eventId);

    res.status(200).json({
      message: "Tickets fetched successfully",
      data: tickets
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error while fetching tickets",
      error: err.message
    });
  }
};

const getTicketsByUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const tickets = await ticketModel.find({ userId })
      .populate({
        path: "eventId",
        select: "eventName eventImage eventCategory startDate endDate latitude longitude stadiumId zoomUrl",
        populate: {
          path: "stadiumId",
          select: "zones location"
        }
      })
      .populate("userId")
      .populate("organizerId", "name")
      .populate("stateId", "Name")
      .populate("cityId", "name");

    res.status(200).json({
      message: "User tickets fetched successfully",
      data: tickets,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching user tickets",
      error: err.message,
    });
  }
};

const getAllTicketsGroupedByEvent = async (req, res) => {
  try {
    const tickets = await ticketModel.find()
      .populate("eventId")
      .populate("userId")
      .populate("stateId")
      .populate("cityId");

    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tickets", error });
  }
};

// NEW: Generate Invoice PDF
const generateInvoice = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    // Fetch ticket details with populated references
    const ticket = await ticketModel.findById(ticketId)
      .populate({
        path: 'eventId',
        select: 'eventName eventType eventCategory startDate endDate eventImage'
      })
      .populate('userId', 'fullName name email phone')
      .populate('stateId', 'Name')
      .populate('cityId', 'name')
      .populate('organizerId', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    // Verify user owns this ticket or is admin
    if (ticket.userId._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'Admin' && 
        req.user.role !== 'Organizer') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${ticketId}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Colors
    const primaryColor = '#2563eb';
    const secondaryColor = '#64748b';
    const accentColor = '#10b981';

    // Header Section
    doc.rect(0, 0, 612, 120).fill('#f8fafc');
    
    doc.fontSize(28)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text('EventEase', 50, 40);
    
    doc.fontSize(11)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text('Your Trusted Event Booking Platform', 50, 72);

    doc.fontSize(18)
       .fillColor('#1e293b')
       .font('Helvetica-Bold')
       .text('TICKET INVOICE', 400, 50, { align: 'right' });

    // Invoice Details Box
    doc.rect(400, 75, 162, 40).stroke('#e2e8f0');
    doc.fontSize(9)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text('Invoice Date:', 410, 82)
       .text('Invoice No:', 410, 97);
    
    doc.fillColor('#1e293b')
       .font('Helvetica-Bold')
       .text(new Date().toLocaleDateString(), 480, 82)
       .text(`INV-${ticketId.slice(-8).toUpperCase()}`, 480, 97);

    // Customer & Event Section
    let yPos = 150;

    // Customer Details
    doc.fontSize(12)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text('BILLED TO:', 50, yPos);
    
    doc.rect(50, yPos + 20, 240, 100).stroke('#e2e8f0');
    
    doc.fontSize(11)
       .fillColor('#1e293b')
       .font('Helvetica-Bold')
       .text(ticket.userId.fullName || ticket.userId.name, 60, yPos + 30);
    
    doc.fontSize(9)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text(`Email: ${ticket.userId.email}`, 60, yPos + 50)
       .text(`Phone: ${ticket.userId.phone || 'N/A'}`, 60, yPos + 65)
       .text(`Ticket ID: ${ticket._id}`, 60, yPos + 80);

    if (ticket.paymentId) {
      doc.text(`Payment ID: ${ticket.paymentId}`, 60, yPos + 95);
    }

    // Event Details
    doc.fontSize(12)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text('EVENT DETAILS:', 320, yPos);
    
    doc.rect(320, yPos + 20, 242, 100).stroke('#e2e8f0');
    
    doc.fontSize(11)
       .fillColor('#1e293b')
       .font('Helvetica-Bold')
       .text(ticket.eventId.eventName, 330, yPos + 30, { width: 220 });
    
    doc.fontSize(9)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text(`Type: ${ticket.eventId.eventType || 'N/A'}`, 330, yPos + 55)
       .text(`Category: ${ticket.eventId.eventCategory}`, 330, yPos + 70);
    
    const startDate = new Date(ticket.eventId.startDate).toLocaleDateString();
    const endDate = new Date(ticket.eventId.endDate).toLocaleDateString();
    doc.text(`Date: ${startDate}`, 330, yPos + 85)
       .text(`to ${endDate}`, 330, yPos + 100);

    yPos += 140;

    // Location Section
    if (ticket.eventId.eventCategory !== 'ZoomMeeting' && ticket.cityId) {
      doc.fontSize(10)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('VENUE:', 50, yPos);
      
      doc.fontSize(9)
         .fillColor('#1e293b')
         .font('Helvetica')
         .text(`${ticket.cityId.name}, ${ticket.stateId?.Name || ''}`, 50, yPos + 15);
      
      yPos += 40;
    }

    // Seat Details (if applicable)
    if (ticket.selectedSeats && ticket.selectedSeats.length > 0) {
      doc.fontSize(10)
         .fillColor(primaryColor)
         .font('Helvetica-Bold')
         .text('SELECTED SEATS:', 50, yPos);
      
      doc.fontSize(9)
         .fillColor('#1e293b')
         .font('Helvetica')
         .text(ticket.selectedSeats.join(', '), 50, yPos + 15, { width: 500 });
      
      yPos += 40;
    }

    // Pricing Table
    yPos += 20;
    const tableTop = yPos;
    
    // Table Header
    doc.rect(50, tableTop, 512, 30).fill('#f1f5f9');
    
    doc.fontSize(10)
       .fillColor('#1e293b')
       .font('Helvetica-Bold')
       .text('DESCRIPTION', 60, tableTop + 10)
       .text('QTY', 300, tableTop + 10)
       .text('RATE', 380, tableTop + 10)
       .text('AMOUNT', 480, tableTop + 10);

    // Table Row
    const rowY = tableTop + 40;
    doc.rect(50, tableTop + 30, 512, 40).stroke('#e2e8f0');
    
    doc.fontSize(9)
       .fillColor('#1e293b')
       .font('Helvetica')
       .text('Event Ticket', 60, rowY)
       .text(ticket.quantity.toString(), 300, rowY)
       .text(`₹${ticket.ticketRate.toLocaleString()}`, 380, rowY)
       .text(`₹${(ticket.quantity * ticket.ticketRate).toLocaleString()}`, 480, rowY);

    // Subtotal Section
    const subtotalY = rowY + 60;
    doc.fontSize(10)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text('Subtotal:', 380, subtotalY)
       .text(`₹${(ticket.quantity * ticket.ticketRate).toLocaleString()}`, 480, subtotalY);

    // Total Section
    const totalY = subtotalY + 25;
    doc.rect(50, totalY - 5, 512, 35).fill('#f0fdf4');
    
    doc.fontSize(12)
       .fillColor(accentColor)
       .font('Helvetica-Bold')
       .text('TOTAL PAID:', 380, totalY + 5)
       .text(`₹${(ticket.quantity * ticket.ticketRate).toLocaleString()}`, 480, totalY + 5);

    // Footer Section
    const footerY = 700;
    doc.rect(0, footerY, 612, 92).fill('#f8fafc');
    
    doc.fontSize(11)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text('Thank you for choosing EventEase!', 50, footerY + 20, { align: 'center', width: 512 });
    
    doc.fontSize(9)
       .fillColor(secondaryColor)
       .font('Helvetica')
       .text('For any queries or support, please contact us:', 50, footerY + 40, { align: 'center', width: 512 })
       .text('Email: support@eventease.com | Phone: +91 1800-123-4567', 50, footerY + 55, { align: 'center', width: 512 });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Invoice Generation Error:", error);
    
    // Check if headers were already sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error generating invoice",
        error: error.message
      });
    }
  }
};

// NEW: Get invoice data (for frontend preview)
const getInvoiceData = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await ticketModel.findById(ticketId)
      .populate({
        path: 'eventId',
        select: 'eventName eventType eventCategory startDate endDate eventImage'
      })
      .populate('userId', 'fullName name email phone')
      .populate('stateId', 'Name')
      .populate('cityId', 'name')
      .populate('organizerId', 'name email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    // Verify access
    if (ticket.userId._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'Admin' &&
        req.user.role !== 'Organizer') {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ticketId: ticket._id,
        invoiceNumber: `INV-${ticket._id.toString().slice(-8).toUpperCase()}`,
        invoiceDate: new Date(),
        paymentId: ticket.paymentId,
        customer: {
          name: ticket.userId.fullName || ticket.userId.name,
          email: ticket.userId.email,
          phone: ticket.userId.phone
        },
        event: {
          name: ticket.eventId.eventName,
          type: ticket.eventId.eventType,
          category: ticket.eventId.eventCategory,
          startDate: ticket.eventId.startDate,
          endDate: ticket.eventId.endDate,
          image: ticket.eventId.eventImage
        },
        location: {
          city: ticket.cityId?.name,
          state: ticket.stateId?.Name
        },
        seats: ticket.selectedSeats,
        pricing: {
          quantity: ticket.quantity,
          rate: ticket.ticketRate,
          subtotal: ticket.quantity * ticket.ticketRate,
          total: ticket.quantity * ticket.ticketRate
        },
        bookedOn: ticket.createdAt
      }
    });

  } catch (error) {
    console.error("Get Invoice Data Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching invoice data",
      error: error.message
    });
  }
};

const cancelTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { reason = "User requested cancellation" } = req.body;

    const ticket = await ticketModel.findById(ticketId)
      .populate("eventId")
      .populate("userId");

    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    // Check permission
    if (
      ticket.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== "Admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to cancel this ticket",
      });
    }

    // Ticket already cancelled?
    if (ticket.status !== "Active") {
      return res
        .status(400)
        .json({ message: `Ticket already ${ticket.status}` });
    }

    // Event already started?
    const eventStart = new Date(ticket.eventId.startDate);
    if (eventStart <= new Date()) {
      return res.status(400).json({
        message: "Event already started. Cancellation not allowed.",
      });
    }

    // Refund calculation
    const now = new Date();
    const daysUntilEvent = Math.ceil(
      (eventStart - now) / (1000 * 60 * 60 * 24)
    );

    let refundPercentage = 0;
    if (daysUntilEvent >= 7) refundPercentage = 100;
    else if (daysUntilEvent >= 3) refundPercentage = 50;
    else refundPercentage = 0;

    const originalAmount =
      (ticket.ticketRate || 0) * (ticket.quantity || 1);

    const refundAmount = Math.max(
      0,
      Math.round((originalAmount * refundPercentage) / 100)
    );

    // Update ticket
    ticket.status = "Cancelled";
    ticket.cancellationReason = reason;
    ticket.cancellationDate = new Date();
    ticket.refundAmount = refundAmount;

    // IMPORTANT FIXES:
    ticket.refundStatus =
      refundAmount > 0 ? "Pending Approval" : "No Refund";
    ticket.adminApproval = "Pending";

    await ticket.save();

    // Update event seat counts
    const event = await eventModel.findById(ticket.eventId._id);
    if (event) {
      event.bookedSeats = Math.max(
        0,
        (event.bookedSeats || 0) - (ticket.quantity || 0)
      );

      if (Array.isArray(ticket.selectedSeats)) {
        event.bookedSeatLabels = event.bookedSeatLabels.filter(
          (s) => !ticket.selectedSeats.includes(s)
        );
      }

      await event.save();
    }

    // ✔ DO NOT SEND REFUND EMAIL HERE — only cancellation email
    try {
      const to = ticket.userId.email;
      if (to) {
        const subject = `Ticket Cancelled - ${ticket.eventId.eventName}`;
        const html = `
          <p>Hi ${ticket.userId.fullName || ""},</p>
          <p>Your ticket for <strong>${ticket.eventId.eventName}</strong> has been cancelled.</p>
          <p>Your refund request is now <strong>${ticket.refundStatus}</strong> and waiting for admin approval.</p>
          <p>Refund Amount (if approved): ₹${refundAmount}</p>
        `;

        sendingMail(to, subject, html).catch((err) =>
          console.error("Mail error:", err)
        );
      }
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Ticket cancelled & awaiting admin approval",
      refundAmount,
      refundPercentage,
      refundStatus: ticket.refundStatus,
    });
  } catch (err) {
    console.error("cancelTicket error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message });
  }
};

const rejectRefund = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const { remark = "No reason provided" } = req.body;

    const ticket = await ticketModel
      .findById(ticketId)
      .populate("userId")
      .populate("eventId");

    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    if (!["Admin", "Organizer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🔥 Save all rejection details
    ticket.adminApproval = "Rejected";
    ticket.refundStatus = "Rejected";
    ticket.adminRemark = remark;
    ticket.adminActionDate = new Date(); // 🔥 Track when admin took action
    ticket.adminId = req.user._id; // 🔥 Track which admin rejected

    await ticket.save();

    // Send rejection email with admin's remark
    try {
      await sendingMail(
        ticket.userId.email,
        "Refund Request Rejected",
        `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                        color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .alert-box { background: #fee2e2; padding: 20px; border-left: 4px solid #ef4444; 
                          border-radius: 5px; margin: 20px 0; }
              .details-box { background: white; padding: 20px; margin: 20px 0; 
                            border-left: 4px solid #ef4444; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎟️ EventEase</h1>
                <p>Refund Request Update</p>
              </div>
              
              <div class="content">
                <h2>Hi ${ticket.userId.fullName || ticket.userId.name}! 👋</h2>
                
                <div class="alert-box">
                  <h3 style="margin-top: 0; color: #dc2626;">❌ Refund Request Rejected</h3>
                  <p style="margin: 0;">Your refund request for <strong>${ticket.eventId.eventName}</strong> 
                  has been carefully reviewed and unfortunately cannot be approved at this time.</p>
                </div>

                <div class="details-box">
                  <h3 style="margin-top: 0; color: #ef4444;">📋 Rejection Details</h3>
                  
                  <div style="margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Event Name</span>
                      <strong>${ticket.eventId.eventName}</strong>
                    </div>
                  </div>
                  
                  <div style="margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Ticket ID</span>
                      <strong>${ticket._id}</strong>
                    </div>
                  </div>
                  
                  <div style="margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Requested Amount</span>
                      <strong>₹${ticket.refundAmount.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div style="margin: 15px 0; padding: 10px 0;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Decision Date</span>
                      <strong>${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</strong>
                    </div>
                  </div>
                </div>

                <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; 
                           border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">
                    📝 Reason for Rejection:
                  </p>
                  <p style="margin: 0; color: #92400e; font-style: italic;">
                    "${remark}"
                  </p>
                </div>

                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  If you have any questions or would like to discuss this decision, 
                  please don't hesitate to contact our support team.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="mailto:${process.env.EMAIL_USER}" 
                     style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                            color: white; padding: 12px 30px; text-decoration: none; 
                            border-radius: 8px; font-weight: 600;">
                    Contact Support
                  </a>
                </div>
              </div>

              <div class="footer">
                <p style="margin: 0 0 10px 0;"><strong>Thank you for using EventEase!</strong></p>
                <p style="margin: 0;">© ${new Date().getFullYear()} EventEase. All rights reserved.</p>
                <p style="margin: 10px 0 0 0; font-size: 12px;">
                  This is an automated email. Please do not reply.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      );
    } catch (mailErr) {
      console.error("Rejection email failed:", mailErr);
    }

    return res.json({
      success: true,
      message: "Refund request rejected successfully.",
      data: {
        ticketId: ticket._id,
        refundStatus: ticket.refundStatus,
        adminRemark: ticket.adminRemark,
        rejectedAt: ticket.adminActionDate
      }
    });
  } catch (error) {
    console.error("Reject refund error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to reject refund",
      error: error.message 
    });
  }
};

const approveRefund = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;

    const ticket = await ticketModel
      .findById(ticketId)
      .populate("eventId")
      .populate("userId");

    if (!ticket)
      return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status !== "Cancelled") {
      return res
        .status(400)
        .json({ message: "Ticket must be cancelled first" });
    }

    if (!["Admin", "Organizer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🔥 Save approval details
    ticket.adminApproval = "Approved";
    ticket.refundStatus = "Pending"; // waiting for Razorpay process
    ticket.adminActionDate = new Date(); // 🔥 Track when admin approved
    ticket.adminId = req.user._id; // 🔥 Track which admin approved
    
    await ticket.save();

    // Send approval email
    try {
      await sendingMail(
        ticket.userId.email,
        "Refund Request Approved",
        `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                        color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-box { background: #d1fae5; padding: 20px; border-left: 4px solid #10b981; 
                            border-radius: 5px; margin: 20px 0; }
              .details-box { background: white; padding: 20px; margin: 20px 0; 
                            border-left: 4px solid #10b981; border-radius: 5px; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎟️ EventEase</h1>
                <p>Refund Request Update</p>
              </div>
              
              <div class="content">
                <h2>Hi ${ticket.userId.fullName || ticket.userId.name}! 👋</h2>
                
                <div class="success-box">
                  <h3 style="margin-top: 0; color: #059669;">✅ Refund Request Approved!</h3>
                  <p style="margin: 0;">Great news! Your refund request for 
                  <strong>${ticket.eventId.eventName}</strong> has been approved.</p>
                </div>

                <div class="details-box">
                  <h3 style="margin-top: 0; color: #10b981;">💰 Refund Details</h3>
                  
                  <div style="margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Refund Amount</span>
                      <strong style="color: #10b981; font-size: 20px;">
                        ₹${ticket.refundAmount.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  
                  <div style="margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Approved On</span>
                      <strong>${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</strong>
                    </div>
                  </div>
                  
                  <div style="margin: 15px 0; padding: 10px 0;">
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #6b7280;">Status</span>
                      <strong style="color: #2563eb;">Processing...</strong>
                    </div>
                  </div>
                </div>

                <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; 
                           border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⏱️ What's Next?</strong><br>
                    Your refund is now being processed. You'll receive another email once the 
                    amount has been credited to your original payment method. This typically 
                    takes 5-7 business days.
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="mailto:${process.env.EMAIL_USER}" 
                     style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                            color: white; padding: 12px 30px; text-decoration: none; 
                            border-radius: 8px; font-weight: 600;">
                    Contact Support
                  </a>
                </div>
              </div>

              <div class="footer">
                <p style="margin: 0 0 10px 0;"><strong>Thank you for using EventEase!</strong></p>
                <p style="margin: 0;">© ${new Date().getFullYear()} EventEase. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      );
    } catch (mailErr) {
      console.error("Approval email failed:", mailErr);
    }

    return res.json({
      success: true,
      message: "Refund approved! Processing will begin shortly.",
      data: {
        ticketId: ticket._id,
        refundStatus: ticket.refundStatus,
        refundAmount: ticket.refundAmount,
        approvedAt: ticket.adminActionDate
      }
    });
  } catch (error) {
    console.error("Approve refund error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to approve refund",
      error: error.message 
    });
  }
};

// // ------------------------------
// // 2) ADMIN APPROVES REFUND
// // ------------------------------
// const approveRefund = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;

//     const ticket = await ticketModel
//       .findById(ticketId)
//       .populate("eventId")
//       .populate("userId");

//     if (!ticket)
//       return res.status(404).json({ message: "Ticket not found" });

//     if (ticket.status !== "Cancelled") {
//       return res
//         .status(400)
//         .json({ message: "Ticket must be cancelled first" });
//     }

//     if (!["Admin", "Organizer"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     ticket.adminApproval = "Approved";
//     ticket.refundStatus = "Pending"; // waiting for Razorpay process
//     await ticket.save();

//     // Send mail: Refund Approved
//     try {
//       await sendingMail(
//         ticket.userId.email,
//         "Refund Approved",
//         `
//           <p>Your refund request for <strong>${ticket.eventId.eventName}</strong> has been approved.</p>
//           <p>Refund Amount: ₹${ticket.refundAmount}</p>
//           <p>Your refund will be processed shortly.</p>
//         `
//       );
//     } catch (mailErr) {
//       console.error("Approval email failed:", mailErr);
//     }

//     return res.json({
//       success: true,
//       message: "Refund approved!",
//     });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// // ------------------------------
// // 3) ADMIN REJECTS REFUND
// // ------------------------------
// const rejectRefund = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const { remark = "No reason provided" } = req.body;

//     const ticket = await ticketModel
//       .findById(ticketId)
//       .populate("userId")
//       .populate("eventId");

//     if (!ticket)
//       return res.status(404).json({ message: "Ticket not found" });

//     if (!["Admin", "Organizer"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     ticket.adminApproval = "Rejected";
//     ticket.refundStatus = "Rejected";
//     ticket.adminRemark = remark;

//     await ticket.save();

//     // Send mail: Refund Rejected
//     try {
//       await sendingMail(
//         ticket.userId.email,
//         "Refund Rejected",
//         `
//           <p>Your refund request for <strong>${ticket.eventId.eventName}</strong> has been rejected.</p>
//           <p>Reason: ${remark}</p>
//         `
//       );
//     } catch (mailErr) {
//       console.error("Rejection email failed:", mailErr);
//     }

//     return res.json({
//       success: true,
//       message: "Refund request rejected.",
//     });
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// };

// POST /tickets/cancel/:ticketId
// const cancelTicket = async (req, res) => {
//   try {
//     const { ticketId } = req.params;
//     const { reason = "User requested cancellation" } = req.body;

//     const ticket = await ticketModel.findById(ticketId)
//       .populate("eventId")
//       .populate("userId");

//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     // Ownership & role check
//     if (ticket.userId._id.toString() !== req.user._id.toString() && req.user.role !== "Admin") {
//       return res.status(403).json({ message: "You are not allowed to cancel this ticket" });
//     }

//     // Idempotency: disallow cancelling already cancelled/refunded ticket
//     if (ticket.status !== "Active") {
//       return res.status(400).json({ message: `Ticket already ${ticket.status}` });
//     }

//     // Prevent cancellation after event start
//     const eventStart = new Date(ticket.eventId.startDate);
//     if (eventStart <= new Date()) {
//       return res.status(400).json({ message: "Event already started. Cancellation not allowed." });
//     }

//     // Calculate refund using same policy you provided (7 days => 100%, 3-6 => 50%, <3 => 0)
//     const now = new Date();
//     const msPerDay = 1000 * 60 * 60 * 24;
//     const daysUntilEvent = Math.ceil((eventStart - now) / msPerDay);

//     let refundPercentage = 0;
//     if (daysUntilEvent >= 7) refundPercentage = 100;
//     else if (daysUntilEvent >= 3) refundPercentage = 50;
//     else refundPercentage = 0;

//     const originalAmount = (ticket.ticketRate || 0) * (ticket.quantity || 1);
//     const platformFee = 0; // optionally calculate a platform fee here
//     let refundAmount = Math.max(0, Math.round((originalAmount * refundPercentage / 100) - platformFee));

//     // Update ticket fields
//     ticket.status = "Cancelled";
//     ticket.cancellationReason = reason;
//     ticket.cancellationDate = new Date();
//     ticket.refundAmount = refundAmount;
//     // ticket.refundStatus = refundAmount > 0 ? "Pending" : "Completed";
//     ticket.refundStatus = refundAmount > 0 ? "Pending Approval" : "No Refund";
//     await ticket.save();

//     // Release seats and update event booked count
//     const event = await eventModel.findById(ticket.eventId._id);
//     if (event) {
//       event.bookedSeats = Math.max(0, (event.bookedSeats || 0) - (ticket.quantity || 0));
//       if (Array.isArray(ticket.selectedSeats) && ticket.selectedSeats.length) {
//         event.bookedSeatLabels = (event.bookedSeatLabels || []).filter(s => !ticket.selectedSeats.includes(s));
//       }
//       await event.save();
//     }

//     // Optional: link to payment to verify paymentId
//     // If ticket.paymentId exists and refundAmount > 0, you will process Razorpay refund in Phase 2

//     // Send basic email notification to user (non-blocking)
//     try {
//       const to = ticket.userId.email;
//       if (to) {
//         const subject = `Ticket cancelled - ${ticket.eventId.eventName}`;
//         const html = `
//           <p>Hi ${ticket.userId.fullName || ticket.userId.name || ""},</p>
//           <p>Your ticket for <strong>${ticket.eventId.eventName}</strong> has been cancelled.</p>
//           <p><strong>Refund amount:</strong> ₹${refundAmount}</p>
//           <p>Refund status: ${ticket.refundStatus}</p>
//           <p>If you have any questions contact support.</p>
//         `;
//         // If you have sendingMail util:
//         if (typeof sendingMail === "function") {
//           sendingMail(to, subject, html).catch(err => console.error("Mail error:", err));
//         } else {
//           console.log("sendingMail util not present; skipping email send");
//         }
//       }
//     } catch (mailErr) {
//       console.error("Email send failed:", mailErr);
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Ticket cancelled successfully",
//       refundAmount,
//       refundPercentage,
//       refundStatus: ticket.refundStatus,
//     });
//   } catch (err) {
//     console.error("cancelTicket error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// const approveRefund = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;

//     const ticket = await ticketModel
//       .findById(ticketId)
//       .populate("eventId")
//       .populate("userId");

//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     // Only Admin or Organizer can approve
//     if (req.user.role !== "Admin" && req.user.role !== "Organizer") {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     // Make sure it was cancelled first
//     if (ticket.status !== "Cancelled") {
//       return res.status(400).json({ message: "Ticket is not cancelled" });
//     }

//     // Mark approval
//     ticket.adminApproval = "Approved";
//     ticket.refundStatus = "Pending";

//     await ticket.save();

//     return res.json({
//       success: true,
//       message: "Refund approved. Ready for Razorpay refund processing."
//     });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// const rejectRefund = async (req, res) => {
//   try {
//     const ticketId = req.params.ticketId;
//     const { remark } = req.body;

//     const ticket = await ticketModel.findById(ticketId);

//     if (!ticket) return res.status(404).json({ message: "Ticket not found" });

//     if (req.user.role !== "Admin" && req.user.role !== "Organizer") {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     ticket.adminApproval = "Rejected";
//     ticket.refundStatus = "Rejected";
//     ticket.adminRemark = remark;

//     await ticket.save();

//     return res.json({
//       success: true,
//       message: "Refund request rejected."
//     });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };




module.exports = {
  getTicketsByOrganizer,
  getTicketsByUser,
  getAllTicketsGroupedByEvent,
  generateInvoice,
  getInvoiceData,
  cancelTicket,
  approveRefund,
  rejectRefund
};




// const ticketModel = require("../models/TicketModal");

// const getTicketsByOrganizer = async (req, res) => {
//   try {

//     //  Ensure organizer is only accessing their own data
//     // if (req.user._id !== req.params.organizerId) {
//     //   return res.status(403).json({ message: "Unauthorized: You can only access your own tickets." });
//     // }
//    const organizerId = req.user._id
  

//     const rawTickets = await ticketModel.find({ organizerId: organizerId })
//        .populate("eventId")       // Fetch event name
//       .populate("userId") // Optional: show who booked it
//       .populate("stateId", "Name")       // State name
//       .populate("cityId", "name")       // City name ← semicolon was missing here
//       .populate("organizerId")
  
//        // Filter out tickets whose event was deleted
//     const tickets = rawTickets.filter(ticket => ticket.eventId);

//     res.status(200).json({
//       message: "Tickets fetched successfully",
//       data: tickets
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Server error while fetching tickets",
//       error: err.message
//     });
//   }
// };

// const getTicketsByUser = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const tickets = await ticketModel.find({ userId })
//       .populate({
//         path: "eventId",
//         select: "eventName eventImage eventCategory startDate endDate latitude longitude stadiumId",
//         populate: {
//           path: "stadiumId",
//           select: "zones"
//         }
//       })
//       .populate("organizerId", "name")
//       .populate("stateId", "Name")
//       .populate("cityId", "name");

//     res.status(200).json({
//       message: "User tickets fetched successfully",
//       data: tickets,
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "Error fetching user tickets",
//       error: err.message,
//     });
//   }
// };


// // const getTicketsByUser = async (req, res) => {
// //   try {

// //   //   if (req.user._id !== req.params.userId) {
// //   //   return res.status(403).json({ message: "You can only access your own tickets" });
// //   // }

// //   const userId = req.user._id

// //     const tickets = await ticketModel.find({ userId: userId })
// //       .populate("eventId", "eventName startDate")
// //       .populate("organizerId", "name")
// //       .populate("stateId", "Name")
// //       .populate("cityId", "name");

// //     res.status(200).json({
// //       message: "User tickets fetched successfully",
// //       data: tickets
// //     });
// //   } catch (err) {
// //     res.status(500).json({
// //       message: "Error fetching user tickets",
// //       error: err.message
// //     });
// //   }
// // };


// const getAllTicketsGroupedByEvent = async (req, res) => {
//   try {
//     const tickets = await ticketModel.find()
//       .populate("eventId")
//       .populate("userId")
//       .populate("stateId")
//       .populate("cityId");

//     res.status(200).json({ success: true, data: tickets });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Failed to fetch tickets", error });
//   }
// };


// module.exports = {
//   getTicketsByOrganizer,
//   getTicketsByUser,
//   getAllTicketsGroupedByEvent
// };
