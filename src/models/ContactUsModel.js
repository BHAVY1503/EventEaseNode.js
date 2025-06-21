const mongoose = require("mongoose")
const Schema = mongoose.Schema

const contactusSchema = new Schema({

 name:{
    type:String,
    required:true
 },
 company:{
    type:String
 },
 email:{
    type:String,
    required:true,
 },
 phoneNo:{
    type:Number,
    required:true
 },
 eventType:{
    type:String,
    required:true
 },
 message:{
    type:String,
    required:true
 },
 question:{
   type:String
 }

})

module.exports = mongoose.model("contactus",contactusSchema)