const organizerModel = require("../models/OrganizerModel")
const bcrypt = require("bcryptjs")


const organizerRegister = async(req,res)=>{

    try{
        const {name, email, password, phone, organizationName} = req.body;

        const existing = await organizerModel.findOne({email});
        if(existing){
            return res.status(400).json({message:'Email already registerd'})
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(req.body.password, salt)
         req.body.password = hashedPassword
        // const hashedPassword = await bcrypt.hash(password,10)
 
        const createOrganizer = await organizerModel.create(req.body)

        res.status(201).json({
            message:"Organizer was Created",
            data:createOrganizer
        })
    }catch(err){
        console.log(err)
        res.status(404).json({
            message:"server error",
            data:err.message
            
        })
    }
}

const organizerSignin = async(req,res)=>{

    const email = req.body.email;
    const password = req.body.password;

    const foundOrganizerFromEmail = await organizerModel.findOne({email : email}).populate("roleId")
    console.log(foundOrganizerFromEmail)

    if (foundOrganizerFromEmail != null){
        isMatch = bcrypt.compareSync(password, foundOrganizerFromEmail.password)
    }

    if(isMatch === true){
        res.status(200).json({
            message:"Signip Successfully",
            data:foundOrganizerFromEmail
        })
    }else{
        res.status(404).json({
            message:"invalid cred"
        })
    }
} 



const getAllOrganizers = async(req,res)=>{

    const organizer = await organizerModel.find().populate("role")

    res.json({
        message:"organizers are find",
        data:organizer
    })
}

const getOrganizerById = async(req,res)=>{

    const organizerById = await organizerModel.findById(req.params.id)

    res.json({
        message:"organizer find successfully",
        data:organizerById

    })
}

const updateOrganizer = async(req,res)=>{

    try{
    const update = await organizerModel.findByIdAndUpdate(
        req.params.id,
        req.body,
        {new:true}   
    );
    res.status(200).json({
        message:"Update successfully",
        data:update
    })
}catch(err){
    console.log(err)
    res.status(500).json({
        message:"error while updating",
        error:error
    })
}
}

module.exports = {
    organizerRegister,
    getAllOrganizers,
    getOrganizerById,
    updateOrganizer,
    organizerSignin
}