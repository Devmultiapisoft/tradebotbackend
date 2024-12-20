const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.createUser = async (req, res) => {
  try {
    const { username, name, location, email, phone, deviceID, password } = req.body;

    // Validate the required fields
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Check if the username, email, or phone already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Username, email, or phone already in use. Please choose another.",
      });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({
      username,
      name,
      location,
      email,
      phone,
      deviceID,
      password: hashedPassword, // Save the hashed password
    });
    
    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: { id: newUser._id, username: newUser.username, name: newUser.name },
    });
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res.status(500).json({ error: "Server error while creating user" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while fetching users" });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  const { userid, password } = req.body;
  console.log(password)

  try {
    // Find the user by email or phone (userid can be either)
    const user = await User.findOne({ $or: [{ username: userid }] });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials1" });
    }
    const trimmedPassword = password.trim();  // Trim spaces
const isMatch = await bcrypt.compare(trimmedPassword, user.password);

    // Compare password with hashed password in database
    // const isMatch = await bcrypt.compare(password, user.password);
    console.log(userid, password, user.password, isMatch);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials2" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id,name:user.name }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login" });
  }
};
