const BotSettings = require("../models/botSettings");
const botService = require("../services/botService"); // Path to your botService

// Controller to fetch the current price
exports.getCurrentPrice = async (req, res) => {
  try {
    const price = await botService.getPrice(); // Call the getPrice method from botService
    if (price === null) {
      return res.status(500).json({ error: "Failed to fetch current price" });
    }
    res.status(200).json({ price }); // Send the price back to the client
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch current price", message: error.message });
  }
};

// Controller to create/update trading parameters
exports.createBotSettings = async (req, res) => {
  const { targetPrice, lowerTargetPrice, sellAmountUSD,isApprovalRequired,pancakerouteraddress,upitaddress, userid } = req.body;

  if (!targetPrice || !lowerTargetPrice || !sellAmountUSD  || !userid) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Check if settings already exist for the user
    const existingSettings = await BotSettings.findOne({ user: userid });

    if (existingSettings) {
      // If settings exist, update them
      existingSettings.targetPrice = targetPrice;
      existingSettings.lowerTargetPrice = lowerTargetPrice;
      existingSettings.sellAmountUSD = sellAmountUSD;
      existingSettings.isApprovalRequired = isApprovalRequired;
      existingSettings.pancakerouteraddress = pancakerouteraddress;
      existingSettings.upitaddress = upitaddress;

      await existingSettings.save();
      res.status(200).json({
        message: "Bot settings updated successfully",
        settings: existingSettings,
      });
    } else {
      // If settings do not exist, create new settings
      const newSettings = new BotSettings({
        targetPrice,
        lowerTargetPrice,
        sellAmountUSD,
        isApprovalRequired,
        isApprovalRequired,
        pancakerouteraddress,
        upitaddress,
        user: userid,
      });

      await newSettings.save();
      res.status(200).json({
        message: "Bot settings created successfully",
        settings: newSettings,
      });
    }

    // Optionally: You could also call botService here to update the trading parameters
    // await botService.setTradingParameters(targetPrice, lowerTargetPrice, sellAmountUSD);
    
  } catch (error) {
    console.error("Error in create or update settings:", error.message);
    res.status(500).json({ error: "Failed to update trading parameters", message: error.message });
  }
};

// Controller to fetch bot settings for a specific user
exports.getBotSettings = async (req, res) => {
  const { userId } = req.params;

  try {
    const settings = await BotSettings.findOne({ user: userId });
    if (!settings) {
      return res.status(404).json({ error: "Bot settings not found for the user" });
    }

    res.status(200).json({
      targetPrice: settings.targetPrice,
      lowerTargetPrice: settings.lowerTargetPrice,
      sellAmountUSD: settings.sellAmountUSD,
      pancakerouteraddress: settings.pancakerouteraddress,
      upitaddress: settings.upitaddress,
    });
  } catch (error) {
    console.error("Error fetching bot settings:", error.message);
    res.status(500).json({ error: "Failed to fetch bot settings", message: error.message });
  }
};

// Controller to start the bot
exports.start = (req, res) => {
  try {
    console.log("Starting the bot service...");
    botService.monitorPrices(); // Start the bot
    res.status(200).json({ message: "Bot started successfully." });
  } catch (error) {
    console.error("Error starting bot:", error.message);
    res.status(500).json({ error: "Failed to start the bot", message: error.message });
  }
};
exports.stop =  (req, res) => {
  try {
    console.log("Starting the bot service...");
     botService.stopBot(); // Start the bot
    res.status(200).json({ message: "Bot stopped successfully." });
  } catch (error) {
    console.error("Error stoping bot:", error.message);
    res.status(500).json({ error: "Failed to stop the bot", message: error.message });
  }
};

