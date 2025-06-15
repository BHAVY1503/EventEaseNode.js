const mongoose = require("mongoose")
const Schema = mongoose.Schema

const stateSchema = new Schema({

    name:{
        type:String,
        required:true,
        uniqe:true
    }
})

module.exports = mongoose.model("state",stateSchema)