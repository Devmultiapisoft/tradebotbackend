const { ethers } = require("ethers");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const BotSettings = require("../models/botSettings");
const mongoose = require("mongoose");
const { Server } = require("socket.io"); // Import Socket.IO
const http = require("http"); // Import http module

const app = express();
app.use(express.json()); // for parsing JSON bodies
app.use(cors({
  origin: "http://localhost:3000",  // Update this to match the frontend URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
}));

const httpServer = http.createServer(app); // Create HTTP server using Express app

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",  // Update to match your frontend's URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

let upperTargetPrice;
let lowerTargetPrice;
let sellAmountInUSD;
let isBotRunning = false;
let isApprovalRequired;
let PANCAKE_ROUTER_ADDRESS;
let UPIT_ADDRESS;
let tokenContract;
let routerContract;
async function fetchTradingParameters(userId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID format");
    }
    const objectId = new mongoose.Types.ObjectId(userId);
    const settings = await BotSettings.findOne({ user: objectId });

    if (!settings) {
      throw new Error("Bot settings not found for the user");
    }

    // Fetch additional settings from the database
    upperTargetPrice = parseFloat(settings.targetPrice);
    lowerTargetPrice = parseFloat(settings.lowerTargetPrice);
    sellAmountInUSD = parseFloat(settings.sellAmountUSD);
    isApprovalRequired = settings.isApprovalRequired;
    
    // Fetch router and token addresses
    PANCAKE_ROUTER_ADDRESS = settings.pancakerouteraddress;
    UPIT_ADDRESS = settings.upitaddress;
    routerContract = new ethers.Contract(PANCAKE_ROUTER_ADDRESS, ROUTER_ABI, wallet);
    tokenContract = new ethers.Contract(UPIT_ADDRESS, TOKEN_ABI, wallet);

    // Now use these dynamically in contract initialization

    // Emit user-friendly message
    io.emit("botMessage", `Trading settings loaded! Upper Target: ${upperTargetPrice}, Lower Target: ${lowerTargetPrice}, Sell Amount: ${sellAmountInUSD} USD`);
    
    // Return values for further use
    return { routerContract, tokenContract, isApprovalRequired };
  } catch (error) {
    console.error("Error fetching trading parameters:", error.message);
    io.emit("botMessage", `Failed to load trading settings: ${error.message}`);
    throw error;
  }
}


const RPC_URL = process.env.RPC_URL;
const WALLET_PRIVATE_KEY = process.env.PRIVATE_KEY;
const ACCOUNT = process.env.ACCOUNT;
const PANCAKE_PAIR_ADDRESS = "0xea8e174e7084ca40b5436b7ed0e7f855c77ce907";
// const PANCAKE_ROUTER_ADDRESS = "0x10ed43c718714eb63d5aa57b78b54704e256024e";
const USDT_ADDRESS = "0x55d398326f99059ff775485246999027b3197955";
// const UPIT_ADDRESS = "0x4db7b2fd0a370170a874926b6fd98d34d3d488b5";

const MONITOR_INTERVAL_MS = 1000;
const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const pairContract = new ethers.Contract(PANCAKE_PAIR_ADDRESS, PAIR_ABI, provider);
// const routerContract = new ethers.Contract(PANCAKE_ROUTER_ADDRESS, ROUTER_ABI, wallet);
// const tokenContract = new ethers.Contract(UPIT_ADDRESS, TOKEN_ABI, wallet);

async function getPrice() {
  try {
    const { reserve0, reserve1 } = await pairContract.getReserves();
    const usdtReserve = parseFloat(ethers.formatUnits(reserve1, 18));
    const upitReserve = parseFloat(ethers.formatUnits(reserve0, 18));
    if (upitReserve === 0) throw new Error("UPiT reserve is zero, price calculation failed.");

    // Emit a user-friendly price message
    const price = usdtReserve / upitReserve;
    io.emit("botMessage", `Current price is approximately ${usdtReserve / upitReserve} USDT per UPiT`);
    io.emit("priceUpdate", price);
    return usdtReserve / upitReserve;
  } catch (error) {
    console.error("Error fetching price:", error.message);
    io.emit("botMessage", `Error while fetching price: ${error.message}. Please try again later.`);
    return null;
  }
}

async function approveToken(amountInTokens) {
  try {
    console.log("Approving UPiT tokens for PancakeSwap Router...");
    const tx = await tokenContract.approve(PANCAKE_ROUTER_ADDRESS, amountInTokens);
    console.log(`Approval Transaction Hash: ${tx.hash}`);
    await tx.wait();
    console.log("Token Approval Confirmed.");

    // Emit user-friendly approval confirmation
    io.emit("botMessage", "Token approval confirmed. You can now proceed with the transaction.");
  } catch (error) {
    console.error("Error approving token:", error.message);
    io.emit("botMessage", `Error approving token: ${error.message}. Please check your wallet or try again.`);
    throw error;
  }
}

async function executeSell(amountInUSD) {
  try {
    console.log(`Attempting to sell tokens for ${amountInUSD} USD`);

    const currentPrice = await getPrice();
    if (!currentPrice) throw new Error("Unable to fetch current price");

    const amountToSell = amountInUSD / currentPrice;
    const amountIn = ethers.parseUnits(amountToSell.toString(), 18);
    const deadline = Math.floor(Date.now() / 1000) + 60 * 5;
    const path = [UPIT_ADDRESS, USDT_ADDRESS];
    const to = ACCOUNT;

    if (isApprovalRequired) {
      await approveToken(amountIn); // Perform the approval if required
    }


    const tx = await routerContract.swapExactTokensForTokens(
      amountIn,
      0,
      path,
      to,
      deadline
    );

    // Emit user-friendly messages
    io.emit("botMessage", "Your sell order has been placed! Please wait for confirmation...");
    await tx.wait();
    io.emit("botMessage", "Transaction confirmed. Your sell is complete!");
  } catch (error) {
    console.error("Error executing sell trade:", error.message);
    io.emit("botMessage", `Error during the sale: ${error.message}. Please try again.`);
  }
}

async function monitorPrices() {
  if (isBotRunning) {
    console.log("Bot is already running...");
    io.emit("botMessage", "The bot is already running.");
    return;
  }

  console.log("Fetching trading parameters...");
  await fetchTradingParameters(process.env.USER_ID);

  console.log("Monitoring prices...");
  isBotRunning = true;

  let selling = false;
  while (isBotRunning) {
    try {
      const price = await getPrice();
      if (!price) {
        console.warn("Price fetch failed, retrying...");
        io.emit("botMessage", "Price fetch failed, retrying...");
        await new Promise((resolve) => setTimeout(resolve, MONITOR_INTERVAL_MS));
        continue;
      }

      if (!selling && price >= upperTargetPrice) {
        console.log(`Upper Target Price Reached (${price}). Starting to Sell...`);
        io.emit("botMessage", `Upper Target Price reached: ${price}. Starting to sell...`);
        selling = true;
      }

      if (selling) {
        if (price >= lowerTargetPrice) {
          console.log(`Price Above Lower Target (${price}). Executing Sell...`);
          await executeSell(sellAmountInUSD);
        } else {
          console.log(`Price Dropped Below Lower Target (${price}). Stopping Sales.`);
          io.emit("botMessage", "Price dropped below the lower target. Stopping sales.");
          selling = false;
        }
      }
    } catch (error) {
      console.error("Error in price monitoring loop:", error.message);
      io.emit("botMessage", `Error in price monitoring: ${error.message}. Please try again later.`);
    }

    await new Promise((resolve) => setTimeout(resolve, MONITOR_INTERVAL_MS));
  }
}

function stopBot() {
  if (!isBotRunning) {
    console.log("Bot is not running...");
    io.emit("botMessage", "The bot is not running.");
    return;
  }
  isBotRunning = false;
  console.log("Bot has been stopped.");
  io.emit("botMessage", "The bot has been stopped.");
}

// Emit real-time messages to the frontend
function sendBotMessage(message) {
  io.emit("botMessage", message);
}

// Start Express server and listen on port 5000
httpServer.listen(5001, () => {
  console.log("Express and WebSocket server is running on http://localhost:5001");
});
(async () => {
  try {
  
    await fetchTradingParameters(process.env.USER_ID);
  } catch (error) {
    console.error("Critical error in bot execution:", error.message);
 
    process.exit(1); // Optionally, restart the bot using a process manager like PM2
  }
})();
module.exports = {
  getPrice,
  monitorPrices,
  executeSell,
  stopBot,
  sendBotMessage
};
