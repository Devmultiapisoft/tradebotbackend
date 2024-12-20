const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// Register route
router.post("/register", userController.createUser);

// Login route
router.post("/login", userController.loginUser);

// Get all users
router.get("/", userController.getUsers);

module.exports = router;
