const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: "", // Optional: Default value if not provided
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  deviceID: {
    type: String,
    required: true,
  },
  username: {  // Add username field
    type: String,
    required: true,  // Ensure that the username is provided
    unique: true,    // Unique constraint for username
  },
  password: {
    type: String,
    required: true,
  },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
  
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
// });

module.exports = mongoose.model("User", userSchema);
