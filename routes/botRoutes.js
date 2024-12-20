const express = require("express");
const router = express.Router();
const botController = require("../controllers/botController"); // Make sure the path is correct

// Route to get the current price of UPiT in terms of USDT
router.get("/current-price", botController.getCurrentPrice); 

// Route to update or create trading parameters (target price, lower target price, sell amount)
router.post("/trading-parameters", botController.createBotSettings);

// Route to get trading parameters for a specific user
router.get("/trading-parameters/:userId", botController.getBotSettings); // Ensure this is correctly mapped

// Route to start the bot and begin price monitoring
router.post("/start", botController.start);
router.post("/stop", botController.stop);
router.get("/price", botController.getCurrentPrice);

module.exports = router;
