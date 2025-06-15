const stateModel = require("../models/StateModel")

const addState = async(req, res)=>{

    try{
        const addState = await stateModel.create(req.body)

        res.status(201).json({
            message:"Saved state successfully",
            data:addState
        })
    }catch(err){
        res.status(500).json({
            message:err
        })
    }
}

const getAllStates = async(req,res)=>{

    try{
    const getStates = await stateModel.find()

    res.status(201).json({
        message:"all state fatched successfully",
        data:getStates
    })
}catch(err){
    res.status(500).json({
        message:err
    })
}
}

const getStateById = async(req,res)=>{
    try{
        const getbyid = await stateModel.findById(req.params.id)

        res.status(200).json({
            message:"state found successfully",
            data:getbyid
        })
    }catch(err){
        res.status(500).json({
            message:err
        })
    }
}

module.exports = {
    addState,
    getAllStates,
    getStateById
}