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
    stateId:{
        type:Schema.Types.ObjectId,
        ref:"state",
        required:true
    },
    cityId:{
        type:Schema.Types.ObjectId,
        ref:"city",
        required:true
    },
    organizerId:{
        type:Schema.Types.ObjectId,
        ref:"organizer",
        // required:true
    },
    eventImgUrl:{
        type:String
    },
    bookedSeats: {
  type: Number,
  default: 0
},

    // rating: {
    // type: Number,
    // min: 1,
    // max: 5,
    // default: 0,
    // },

    

})

module.exports = mongoose.model("event",eventsSchema)
