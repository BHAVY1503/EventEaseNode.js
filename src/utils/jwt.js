const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load from .env

const SECRET_KEY = process.env.JWT_SECRET;
// const SECRET_KEY = "secret"; // ✅ Define it directly

exports.generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.roleId.name,
    },
    SECRET_KEY,
    { expiresIn: "1d" }
  );
};

exports.SECRET_KEY = SECRET_KEY; // ✅ Export it for verification use
