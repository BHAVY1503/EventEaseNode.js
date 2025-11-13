// TicketController.js - Complete Updated Version
const ticketModel = require("../models/TicketModal");
const PDFDocument = require('pdfkit');

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

module.exports = {
  getTicketsByOrganizer,
  getTicketsByUser,
  getAllTicketsGroupedByEvent,
  generateInvoice,
  getInvoiceData
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
