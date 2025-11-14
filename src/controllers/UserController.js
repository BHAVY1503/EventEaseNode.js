// const UserModel = require("../models/UserModel");
const userModel = require("../models/UserModel")
const roleModel = require("../models/RoleModels")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const SECRET_KEY = "secret"
const { OAuth2Client } = require("google-auth-library"); 
const crypto = require("crypto");
const { sendingMail } = require("../utils/MailUtils");


const client = new OAuth2Client("342037145091-qvhlig4d6tn8p35ho40kc8c468mpnqug.apps.googleusercontent.com")
 
const googleLogin = async (req, res) => {
  const { token } = req.body;

  try{
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "342037145091-qvhlig4d6tn8p35ho40kc8c468mpnqug.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await userModel.findOne({ email }).populate("roleId");

    if (!user) {
      // If not exists, register a new user with default "User" role
      const userRole = await roleModel.findOne({ name: "User" });
     if (!userRole) return res.status(500).json({ message: "User role not found" });

      user = await userModel.create({
        email,
        fullName:name,
        password: "google-oauth", // dummy password
        roleId: userRole._id // 
      });
    }

    const jwtToken = jwt.sign(
      { _id: user._id, role: user.roleId?.name },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token: jwtToken, data: user });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(401).json({ message: "Invalid Google Token" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const foundUser = await userModel.findOne({ email }).populate("roleId");
    if (!foundUser) return res.status(404).json({ message: "Email not found" });
//     if (!foundUser.isVerified) {
//   return res.status(403).json({
//     message: "Please verify your email before logging in."
//   });
// }

    const isMatch = bcrypt.compareSync(password, foundUser.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { _id: foundUser._id, role: foundUser.roleId?.name },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login successful", data: foundUser, token });
  } catch (err) {
    res.status(500).json({ message: "Login error", error: err.message });
  }
};

// const loginUser = async(req,res)=>{
    
//     const email = req.body.email
//     const password = req.body.password

//   const foundUserFromEmail = await userModel.findOne({ email: email }).populate("roleId")
//   console.log(foundUserFromEmail);
  
//   if (foundUserFromEmail != null) {

//     const isMatch = bcrypt.compareSync(password, foundUserFromEmail.password);

//     if (isMatch == true) {
//       res.status(200).json({
//         message: "login success",
//         data: foundUserFromEmail,
//       });
//     } else {
//       res.status(404).json({
//         message: "invalid cred..",
//       });
//     }
//   } else {
//     res.status(404).json({
//       message: "Email not found..",
//     });
//   }
// };
 
// const signup = async(req,res)=>{
 
//     try{
//     const salt = bcrypt.genSaltSync(10);
//     const hashedPassword = bcrypt.hashSync(req.body.password, salt)
//     req.body.password = hashedPassword
//     const createUser = await userModel.create(req.body)

//     res.status(201).json({
//         message:"user Created..",
//         data: createUser
//     })

//     }catch(err){
//         console.log(err)
//         res.status(500).json({
//             message:"error creating user",
//             data:err.message
//         })
//     } 
// }

const signup = async (req, res) => {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await userModel.create({
      ...req.body,
      password: hashedPassword,
      verificationToken,
      isVerified: false
    });

    // Send email
    const verifyLink = `http://localhost:5173/verify/${verificationToken}`;

    await sendingMail(
      user.email,
      "Verify Your EventEase Account",
      `
        <h2>Verify Your Email</h2>
        <p>Click the link below to activate your account:</p>
        <a href="${verifyLink}" target="_blank">Verify Now</a>
      `
    );

    res.status(201).json({
      message: "User registered. Please check your email to verify.",
      data: user
    });

  } catch (err) {
    res.status(500).json({
      message: "Error creating user",
      data: err.message
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await userModel.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generate new verification token
    const token = crypto.randomBytes(32).toString("hex");
    user.verificationToken = token;
    await user.save();

    // Generate verification URL
    const verifyURL = `http://localhost:5173/verify/${token}`;

    // Email content
    const htmlContent = `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${verifyURL}" target="_blank">Verify Email</a>
    `;

    await sendingMail(user.email, "Verify Your Email", htmlContent);

    res.status(200).json({ message: "Verification email resent successfully" });
  } catch (err) {
    console.error("Resend verification failed:", err);
    res.status(500).json({
      message: "Failed to resend verification email",
      error: err.message,
    });
  }
};


const getAllUsers = async(req,res)=>{
    
    const allUser = await userModel.find().select("-password").populate("roleId")

    res.json({
        message:"user find",
        data:allUser
    })
}

const getUserById = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }
    res.status(200).json({
      message: "User found successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error fetching user",
      data: err.message,
    });
  }
};


const deleteUser = async (req, res) => {
  try {
    const user = await userModel.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
      data: user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
      error: error.message
    });
  }
};


const getUserByToken = async (req, res) => {
  try {
    // `req.user` is added by your `verifyToken` middleware
    const userId = req.user._id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        data: null,
      });
    }

    res.status(200).json({
      message: "User found successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error fetching user",
      data: err.message,
    });
  }
};


 
module.exports = {
    signup,
    getAllUsers,
    getUserById,
    loginUser,
    deleteUser, 
    getUserByToken,
    googleLogin,
    verifyEmail,
    resendVerificationEmail,

 }