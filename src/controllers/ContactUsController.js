const contactusModel = require("../models/ContactUsModel")

const sendMessage = async(req,res)=>{
    try{
    const message = await contactusModel.create(req.body) 
    
    res.status(201).json({
        message:"mesaage send successfully..",
        data:message
    })
}catch(err){
    console.error("error while sending message..",err),
    res.status(500).json({
        message:err.message
    })
}
}

const getMessage = async(req,res)=>{
    try{
        const message = await contactusModel.find()
        res.status(200).json({
            message:"message found successfully",
            data:message
        })
    }catch(err){
        console.error("error to found message..",err),
        res.status(500).json({
            message:err.message
        })
    }
}

module.exports = {
    sendMessage,
    getMessage
}