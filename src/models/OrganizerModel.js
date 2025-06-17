const mongoose = require("mongoose")
const Schema = mongoose.Schema

const organizerSchema = new Schema({
    
    name:{
        type:String,
        required:true
    },
    organizationName:{
        type:String,
    },
    email:{
        type:String,
        uniqe:true,
        required:true
    },
    password:{
        type:String
    },
    PhoneNo:{
        type:Number
    },
     roleId:{
        type:Schema.Types.ObjectId,
        ref:"role"
    },
     events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
   address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zip: {type: String}
  },
    profileImg: { type: String, default: "" },
    createdAt: {
    type: Date,
    default: Date.now,
  },
  stateId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "state"
},
cityId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "city"
}

})

module.exports = mongoose.model("organizer",organizerSchema)