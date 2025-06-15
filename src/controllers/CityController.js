const cityModel = require("../models/CityModel")

const addcity = async(req,res)=>{
   try{
    const addcity = await cityModel.create(req.body)

    res.status(201).json({
        message:"city saved successfully",
        data:addcity
    })
   }catch(err){
    res.status(500).json({
        message:err
    })
   }
}

const getAllCities = async(req,res)=>{
    try{
        const getcities = await cityModel.find()

        res.status(200).json({
            message:"all city fatched successfully",
            data:getcities
        })
    }catch(err){
        res.status(500).json({
            message:err
        })
    }
}

const getCityById = async(req,res)=>{
    try{
        const cityById = await cityModel.findById(req.params.id)

        res.status(200).json({
            message:"city found..",
            data:cityById
        })
    }catch(err){
        res.status(500).json({
            message:err
        })
    }
}


module.exports = {
    addcity,
    getAllCities,
    getCityById
}