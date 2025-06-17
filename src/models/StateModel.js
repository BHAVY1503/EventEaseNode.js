const mongoose = require("mongoose")
const Schema = mongoose.Schema

const stateSchema = new Schema({

    Name:{
        type:String,
        required:true,
        unique:true
    }
})

module.exports = mongoose.model("state",stateSchema)