const organizerModel = require("../models/OrganizerModel")
const roleModel = require("../models/RoleModels")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
const SECRET_KEY = "secret";
const { OAuth2Client } = require("google-auth-library"); 
const crypto = require("crypto");
const {sendingMail} = require("../utils/MailUtils");

const client = new OAuth2Client("342037145091-qvhlig4d6tn8p35ho40kc8c468mpnqug.apps.googleusercontent.com")
 
// const googleLogin = async (req, res) => {
//   const { token } = req.body;

//   try {
//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: "342037145091-qvhlig4d6tn8p35ho40kc8c468mpnqug.apps.googleusercontent.com",
//     });

//     const payload = ticket.getPayload();
//     const { email, name } = payload;

//     let organizer = await organizerModel.findOne({ email }).populate("roleId");

//     if (!organizer) {
//       // If not exists, register a new user with default "User" role
//       const organizerRole = await roleModel.findOne({ name: "Organizer" });
//      if (!organizerRole) return res.status(500).json({ message: "Organizer role not found" });

//       organizer = await organizerModel.create({
//         email,
//         name,
//         password: "google-oauth", // dummy password
//         roleId: organizerRole._id // 
//       });
//     }

//     const jwtToken = jwt.sign(
//       { _id: organizer._id, role: organizer.roleId?.name },
//       SECRET_KEY,
//       { expiresIn: "1h" }
//     );

//     res.status(200).json({ token: jwtToken, data: organizer });
//   } catch (err) {
//     console.error("Google Login Error:", err);
//     res.status(401).json({ message: "Invalid Google Token" });
//   }
// };
const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "342037145091-qvhlig4d6tn8p35ho40kc8c468mpnqug.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let organizer = await organizerModel.findOne({ email }).populate("roleId");

    const organizerRole = await roleModel.findOne({ name: "Organizer" });
    if (!organizerRole) {
      return res.status(500).json({ message: "Organizer role not found" });
    }

    // If organizer does not exist → create one
    if (!organizer) {
      organizer = await organizerModel.create({
        name,
        email,
        profileImg: picture,
        // password: "google-oauth", 
        password: null,
        loginType: "google",
        isVerified: true,             // ⭐ FIX 1 – Google user automatically verified
        verificationToken: null,      // ⭐ FIX 2 – No need for email verification
        roleId: organizerRole._id,    // ⭐ FIX 3 – Save role properly
      });
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      {
        _id: organizer._id,
        role: organizer.roleId?.name || "Organizer",  // ⭐ FIX 4 – Safe role extraction
      },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Google Login successful",
      token: jwtToken,
      data: organizer,
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(401).json({ message: "Invalid Google Token" });
  }
};

const organizerRegister = async (req, res) => {
  try {
    const { name, email, password, phone, organizationName } = req.body;

    const existing = await organizerModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Fetch role from roles collection
    const organizerRole = await roleModel.findOne({ name: "Organizer" });
    if (!organizerRole) {
      return res.status(500).json({ message: "Organizer role not found" });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newOrganizer = await organizerModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      organizationName,
      isVerified: false,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24*60*60*1000,
      roleId: organizerRole._id    // ⭐ IMPORTANT: Save roleId
    });

    // Send verification mail
    const verifyLink = `http://localhost:5173/organizer/verify/${verificationToken}`;

    await sendingMail(
      newOrganizer.email,
      "Verify your Organizer Account",
      `
        <h2>Verify Your Organizer Account</h2>
        <p>Click below to verify:</p>
        <a href="${verifyLink}" target="_blank">Verify Now</a>
      `
    );

    res.status(201).json({
      message: "Organizer created. Please check your email to verify.",
      data: newOrganizer
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


const organizerSignin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const organizer = await organizerModel.findOne({ email }).populate("roleId");

    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found.." });
    }

    if (organizer.loginType === "google") {
    return res.status(403).json({
    message: "This organizer registered with Google. Please login using Google."
   });
   }

    const isMatch = bcrypt.compareSync(password, organizer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    //create jwt token containing userId and role
    // const token = jwt.sign(
    //   { _id: organizer._id, role: organizer.roleId.name },
    //   SECRET_KEY,
    //   { expiresIn: "1d" }
    // );
     
    const token = jwt.sign(
  { 
    _id: organizer._id, 
    role: organizer.roleId?.name || "Organizer" 
  },
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

    const organizer = await organizerModel.find().select("-password").populate("roleId")

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
 
   try {
      const organizer = await organizerModel.findByIdAndDelete(req.params.id);
  
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }
  
      res.json({
        message: "Organizer deleted successfully",
        data: organizer
      });
    } catch (error) {
      res.status(500).json({
        message: "Error deleting Organizer",
        error: error.message
      });
    }
  };
   


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

const verifyOrganizerEmail = async (req, res) => {
  try {
    console.log("=== BACKEND VERIFICATION CALLED ===");
    console.log("Full URL:", req.originalUrl);
    console.log("Route path:", req.path);
    console.log("Params:", req.params);
    
    const { token } = req.params;
    console.log("Token received:", token);

    const organizer = await organizerModel.findOne({ verificationToken: token });
    
    console.log("Organizer found:", organizer ? "YES" : "NO");
    if (organizer) {
      console.log("Organizer email:", organizer.email);
      console.log("Is verified:", organizer.isVerified);
    }

    if (!organizer) {
      console.log("Token not found in database");
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    organizer.isVerified = true;
    organizer.verificationToken = null;
    await organizer.save();

    console.log("Verification successful!");
    res.json({ message: "Organizer email verified successfully!" });

  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



const resendOrganizerVerification = async (req, res) => {
  try {
    const organizerId = req.user._id;

    const organizer = await organizerModel.findById(organizerId);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer not found" });
    }

    if (organizer.isVerified) {
      return res.status(400).json({ message: "Organizer already verified" });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    organizer.verificationToken = token;  // ✅ FIXED: Use 'token' instead of 'newToken'
    await organizer.save();

    const verifyLink = `http://localhost:5173/organizer/verify/${token}`;

    await sendingMail(
      organizer.email,
      "Resend Organizer Verification",
      `
        <h2>Verify Your Organizer Account</h2>
        <p>Click below to verify:</p>
        <a href="${verifyLink}">Verify Now</a>
      `
    );

    res.json({ message: "Verification email sent again" });

  } catch (err) {
    console.error("Resend organizer verification error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



module.exports = {
    organizerRegister,
    getAllOrganizers,
    getOrganizerById,
    updateOrganizer,
    organizerSignin,
    deleteOrganizer,
    getOrganizerSelf,
    googleLogin,
    verifyOrganizerEmail,
    resendOrganizerVerification
}