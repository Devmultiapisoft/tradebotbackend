// models/botSettings.js

const mongoose = require("mongoose");

const botSettingsSchema = new mongoose.Schema({
  targetPrice: {
    type: Number,
    required: true,
  },
  lowerTargetPrice: {
    type: Number,
    required: true,
  },
  sellAmountUSD: {
    type: Number,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isApprovalRequired: {
    type: Boolean,
    default: false, // Default value can be true (approval required)
  },
  pancakerouteraddress: {
    type: String,
    default: false, // Default value can be true (approval required)
  },
  upitaddress: {
    type: String,
    default: false, // Default value can be true (approval required)
  },
});

module.exports = mongoose.model("BotSettings", botSettingsSchema);
