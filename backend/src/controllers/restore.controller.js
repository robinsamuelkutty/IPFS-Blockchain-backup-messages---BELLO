import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import pinataSDK from "@pinata/sdk";
import { ethers } from "ethers";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Convert the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.join(
  __dirname,
  "../../build/contracts/BackupContract.json"
);
const contractABI = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

// Ethereum & IPFS Setup
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
const contractAddress = process.env.SMART_CONTRACT_ADDRESS;
const wallet = new ethers.Wallet(
  process.env.SMART_CONTRACT_PRIVATE_KEY,
  provider
);
const contract = new ethers.Contract(contractAddress, contractABI.abi, wallet);

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

// Helper function to hash emails
const hashEmail = (email) =>
  crypto.createHash("sha256").update(email).digest("hex");

// Restore messages from IPFS
// Function to restore messages from the latest local backup
export const restoreMessages = async (req, res) => {
  try {
    console.log("🔹 Restoring messages from local backup...");

    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      throw new Error("Backup directory does not exist");
    }

    // Get the list of backup files
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith(".json"))
      .map(file => path.join(backupDir, file))
      .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime()); // Sort by modification time (newest first)

    if (backupFiles.length === 0) {
      throw new Error("No backup files found");
    }

    // Use the latest backup file
    const latestBackupFile = backupFiles[0];
    console.log("🔹 Latest backup file:", latestBackupFile);

    // Read the backup file
    const backupData = JSON.parse(fs.readFileSync(latestBackupFile, "utf-8"));
    console.log("✅ Backup data loaded successfully:", backupData);
    console.log("🔹 Restoring messages to the database...");

    // Restore original senderId and receiverId
    const restoredMessages = backupData.map((msg) => ({
      ...msg,
      senderId: msg.originalSenderId, // Restore the original senderId
      receiverId: msg.originalReceiverId, // Restore the original receiverId
    }));

    // Restore messages to the database
    await Message.deleteMany({}); // Clear existing messages
    await Message.insertMany(restoredMessages); // Insert messages from the backup

    console.log("✅ Messages restored successfully");
    res.status(200).json({ 
      success: true,
      message: "Messages restored successfully",
      restoredMessages: restoredMessages.length
    });
  } catch (error) {
    console.error("❌ Error restoring messages:", error);
    res.status(500).json({ error: "Failed to restore messages", details: error.message });
  }
};

// Restore users and allow password reset
export const restoreUsers = async (req, res) => {
  try {
    console.log("🔹 Restoring user data...");

    // Get CID from blockchain
    const cid = await contract.getUserBackup();
    console.log("✅ User CID retrieved from blockchain:", cid);

    // Fetch hashed emails from IPFS
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await fetch(ipfsUrl);
    const userHashes = await response.json();
    console.log("✅ Retrieved user hashes from IPFS:", userHashes);

    // Hash input email and check for a match
    const { email, newPassword } = req.body;
    const hashedEmail = hashEmail(email);

    if (!userHashes.includes(hashedEmail)) {
      return res.status(400).json({ error: "User not found" });
    }

    // If matched, update the password in MongoDB
    const user = await User.findOneAndUpdate(
      { email },
      { password: newPassword },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ error: "Error updating password" });
    }

    console.log("✅ User password updated successfully!");
    res.status(200).json({ message: "User restored and password updated!" });
  } catch (error) {
    console.error("❌ Error in restoreUsers:", error);
    res.status(500).json({ error: "Restore failed", details: error.message });
  }
};
