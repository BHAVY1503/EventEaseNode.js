// const UserModel = require("../models/UserModel");
const userModel = require("../models/UserModel")
const bcrypt = require("bcrypt")

const loginUser = async(req,res)=>{
    
    const email = req.body.email
    const password = req.body.password

  const foundUserFromEmail = await userModel.findOne({ email: email }).populate("roleId")
  console.log(foundUserFromEmail);
  
  if (foundUserFromEmail != null) {

    const isMatch = bcrypt.compareSync(password, foundUserFromEmail.password);

    if (isMatch == true) {
      res.status(200).json({
        message: "login success",
        data: foundUserFromEmail,
      });
    } else {
      res.status(404).json({
        message: "invalid cred..",
      });
    }
  } else {
    res.status(404).json({
      message: "Email not found..",
    });
  }
};

const signup = async(req,res)=>{
 
    try{
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt)
    req.body.password = hashedPassword
    const createUser = await userModel.create(req.body)

    res.status(201).json({
        message:"user Created..",
        data: createUser
    })

    }catch(err){
        console.log(err)
        res.status(500).json({
            message:"error creating user",
            data:err.message
        })
    }

    
}


const getAllUsers = async(req,res)=>{
    
    const allUser = await userModel.find().populate("role")

    res.json({
        message:"user find",
        data:allUser
    })
}

const getUserById = async(req,res)=>{

    const user = await userModel.findById(req.params.id)

    res.json({
        message:"user find successfully",
        data:user
    })
}

module.exports = {
    signup,
    getAllUsers,
    getUserById,
    loginUser

 }