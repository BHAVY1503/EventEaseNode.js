const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactusSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNo: {
      type: String, // ✅ Use String instead of Number — avoids 0 truncation & formatting issues
      required: true,
      match: /^[0-9]{10}$/, // optional validation
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    question: {
      type: String,
      trim: true,
    },

    // ✅ Added fields for better tracking
    senderRole: {
      type: String,
      enum: ["User", "Organizer", "Guest"],
      default: "Guest",
    },

    // ✅ For admins to track replies
    adminReply: {
      type: String,
      default: "",
    },
    isReplied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // auto adds createdAt & updatedAt
);

module.exports = mongoose.model("contactus", contactusSchema);





// const mongoose = require("mongoose")
// const Schema = mongoose.Schema

// const contactusSchema = new Schema({

//  name:{
//     type:String,
//     required:true
//  },
//  company:{
//     type:String
//  },
//  email:{
//     type:String,
//     required:true,
//  },
//  phoneNo:{
//     type:Number,
//     required:true
//  },
//  eventType:{
//     type:String,
//     required:true
//  },
//  message:{
//     type:String,
//     required:true
//  },
//  question:{
//    type:String
//  }

// })

// module.exports = mongoose.model("contactus",contactusSchema)