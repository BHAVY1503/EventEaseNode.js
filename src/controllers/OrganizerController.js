const organizerModel = require("../models/OrganizerModel")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
const SECRET_KEY = "secret";



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

// const organizerSignin = async(req,res)=>{

//     const email = req.body.email;
//     const password = req.body.password;

//     const foundOrganizerFromEmail = await organizerModel.findOne({email}).populate("roleId")
//     console.log(foundOrganizerFromEmail)

//     if (!foundOrganizerFromEmail){
//         return res.status(404).json({
//             message:"Organizer not found.."
//         })
//     //   const isMatch = bcrypt.compareSync(password, foundOrganizerFromEmail.password)
//     }
//     const isMatch = bcrypt.compareSync(password, foundOrganizerFromEmail.password)
//     if(isMatch){
//         res.status(200).json({
//             message:"Signip Successfully",
//             data:foundOrganizerFromEmail
//         })
//     }else{
//         res.status(401).json({
//             message:"invalid cendidate.."
//         })
//     }
// } 

const organizerSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const organizer = await organizerModel.findOne({ email }).populate("roleId");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found.." });
    }

    const isMatch = bcrypt.compareSync(password, organizer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { _id: organizer._id, role: organizer.roleId.name },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Signin Successfully",
      data: organizer,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

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

const deleteOrganizer = async(req,res)=>{

    const organizer = await organizerModel.findByIdAndDelete(req.params.id)

    res.json({
        message:"Organizer Deleted...",
        data:organizer
    })
}

const getOrganizerSelf = async (req, res) => {
  try {
    const organizer = await organizerModel.findById(req.user._id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }
    res.status(200).json({
      message: "Organizer retrieved successfully",
      data: organizer,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


module.exports = {
    organizerRegister,
    getAllOrganizers,
    getOrganizerById,
    updateOrganizer,
    organizerSignin,
    deleteOrganizer,
    getOrganizerSelf
}