const mongoose = require("mongoose")
const Schema = mongoose.Schema

const eventsSchema = new Schema({

    eventType:{
         type:String,
        enum:['Conference','Exhibition','Gala Dinner', 'Incentive','Music consert', 'Meeting','ZoomMeeting', 'Other'],
        required:true
    },
   
    eventName:{
        type:String,
        required:true
    },
     zoomUrl:{
        type:String,
        default:""
    },
    numberOfSeats:{
        type:Number,
        required:true
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true
    },
    ticketRate:{
       type:Number,
       default:"0"
    },
    stateId:{
        type:Schema.Types.ObjectId,
        ref:"state",
          // required: function () {
    //     return this.eventCategory !== "ZoomMeeting"; // only required for Indoor/Outdoor
    // },
        // required:true
     
  },
    
    cityId:{
        type:Schema.Types.ObjectId,
        ref:"city",
        //   required: function () {
        // return this.eventCategory !== "ZoomMeeting"; // only required for Indoor/Outdoor
    // },
        // required:true
    },
    organizerId:{
        type:Schema.Types.ObjectId,
        ref:"organizer",
        // required:true
    },
    eventImgUrl:{
        type:String,
    },
    bookedSeats: {
  type: Number,
  default: 0
},
selectedSeats:{
    type:[String],
    default:[]
},
location:{
    type:String,
    default:""
 },
 latitude: {
    type: Number,
    required: false,
  },
  longitude: {
    type: Number,
    required: false,
  },
  eventCategory: {
  type: String,
  enum: ["Indoor", "Outdoor","ZoomMeeting"],
//   required: true,
 },
 stadiumId: {
  type: Schema.Types.ObjectId,
  ref: "Stadium",
},
bookedSeatLabels: {
  type: [String],
  default: [],
},
zonePrices: {
  type: [Number], // or type: [ { type: Number } ]
  default: []     // optional, fallback to stadium default if not set
},
customZones: [
  {
    zoneName: String,
    seatLabels: [String],
    price: Number,
  }
],

 seatLayout: [String],

   isAdminEvent: {
        type: Boolean,
        default: false
    },

   isApproved: {
    type: Boolean,
    default: false, // false until admin approves
  },

  approvalStatus: {
  type: String,
  enum: ["Pending", "Approved", "Rejected"],
  default: "Pending",
},  

 rejectionReason: { type: String, default: "" },

    // rating: {
    // type: Number,
    // min: 1,
    // max: 5,
    // default:0,
    // },

    

})

module.exports = mongoose.model("event",eventsSchema)
