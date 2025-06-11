const mongoose = require("mongoose")
const Schema = mongoose.Schema

const userSchema = new Schema({

    fullName:{
        type:String,
        required:true 
    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String,
    },
    age:{
      type:Number
    },
    roleId:{
        type:Schema.Types.ObjectId,
        ref:"role"
    },
    status:{
        type:Boolean,
        default:true
    }
})

module.exports = mongoose.model("user",userSchema)