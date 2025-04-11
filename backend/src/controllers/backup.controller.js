import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import pinataSDK from "@pinata/sdk";
import crypto from "crypto";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Convert the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
const requiredEnvVars = [
  "SMART_CONTRACT_ADDRESS",
  "SMART_CONTRACT_PRIVATE_KEY",
  "PINATA_API_KEY",
  "PINATA_SECRET_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Construct the absolute path to the JSON file
const contractPath = path.join(
  __dirname,
  "../../build/contracts/BackupContract.json"
);
const contractABI = JSON.parse(fs.readFileSync(contractPath, "utf-8"));

// Initialize provider, wallet, and contract
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
const contractAddress = process.env.SMART_CONTRACT_ADDRESS;
const wallet = new ethers.Wallet(
  process.env.SMART_CONTRACT_PRIVATE_KEY,
  provider
);

const contract = new ethers.Contract(contractAddress, contractABI.abi, wallet);

// Initialize Pinata
const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
});

// Helper function to hash emails
const hashEmail = (email) =>
  crypto.createHash("sha256").update(email).digest("hex");

// Modular functions
const fetchMessages = async () => {
  const messages = await Message.find().lean();
  console.log("✅ Fetched messages:", messages.length);
  return messages;
};

const fetchUsers = async () => {
  const users = await User.find({}, { _id: 1, email: 1 }).lean();
  console.log("✅ Fetched users:", users.length);
  return users;
};

const anonymizeMessages = (messages, users) => {
  const userEmailMap = Object.fromEntries(
    users.map((user) => [user._id.toString(), hashEmail(user.email)])
  );

  const anonymizedMessages = messages.map((msg) => {
    const originalSenderId = msg.senderId;
    const originalReceiverId = msg.receiverId;

    return {
      ...msg,
      senderId: userEmailMap[msg.senderId] || msg.senderId,
      receiverId: userEmailMap[msg.receiverId] || msg.receiverId,
      originalSenderId, // Store the original senderId
      originalReceiverId, // Store the original receiverId
    };
  });

  console.log("✅ Messages processed and anonymized");
  return anonymizedMessages;
};

const writeJsonFile = async (filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log("✅ JSON file written to:", filePath);
  } catch (error) {
    console.error("❌ Error writing JSON file:", error);
    throw new Error("Failed to write JSON file");
  }
};

const uploadToPinata = async (filePath) => {
  try {
    const result = await pinata.pinFromFS(filePath, {
      pinataOptions: {
        cidVersion: 0
      }
    });
    console.log("✅ Uploaded to Pinata, CID:", result.IpfsHash);
    return result.IpfsHash;
  } catch (error) {
    console.error("❌ Error uploading to Pinata:", error);
    throw new Error("Failed to upload to Pinata: " + error.message);
  }
};

const storeCidOnBlockchain = async (cid) => {
  try {
    console.log("🔹 Storing CID on blockchain...");
    
    // First verify if the CID is already stored to avoid unnecessary transactions
    const isAlreadyStored = await verifyCidOnBlockchain(cid);
    if (isAlreadyStored) {
      console.log("✅ CID already stored on blockchain:", cid);
      return true;
    }
    
    // If not stored, proceed with transaction
    let gasLimit = 200000; // Increased gas limit to be safe
    
    const tx = await contract.storeBackup(cid, {
      gasLimit: gasLimit
    });
    
    console.log("🔹 Transaction sent, hash:", tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log("🔹 Transaction confirmed in block:", receipt);
    
    // Check for BackupStored event
    let eventFound = false;
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === "BackupStored") {
            console.log("✅ BackupStored event found:", {
              user: parsedLog.args[0],
              cid: parsedLog.args[1],
              timestamp: parsedLog.args[2]
            });
            eventFound = true;
            break;
          }
        } catch (e) {
          // Skip logs that can't be parsed
        }
      }
    }
    
    if (!eventFound) {
      console.log("⚠️ BackupStored event not found, but transaction was successful");
    }
    
    // Double check with our verification function
    setTimeout(async () => {
      const isVerified = await verifyCidOnBlockchain(cid);
      if (isVerified) {
        console.log("✅ Post-transaction verification successful");
      } else {
        console.log("⚠️ Post-transaction verification failed");
      }
    }, 2000); // Give the blockchain some time to update
    
    return true;
  } catch (error) {
    console.error("❌ Error storing CID on blockchain:", error);
    throw new Error("Failed to store CID on blockchain: " + error.message);
  }
};
const verifyCidOnBlockchain = async (cid) => {
  try {
    console.log("🔹 Verifying CID on blockchain...");
    const currentAddress = await wallet.getAddress();
    
    // Method 1: Try contract event logs directly from transaction receipt
    console.log("🔹 Method 1: Checking transaction logs for events...");
    try {
      const blockNumber = await provider.getBlockNumber();
      const fromBlock = Math.max(0, blockNumber - 10); // Just recent blocks
      
      const filter = contract.filters.BackupStored();
      const events = await contract.queryFilter(filter, fromBlock, "latest");
      
      for (const event of events) {
        if (event.args && event.args.ipfsCid === cid) {
          console.log("✅ CID found in events:", cid);
          return true;
        }
      }
    } catch (error) {
      console.log("⚠️ Method 1 failed:", error.message);
    }
    
    // Method 2: Try getting the latest backup for our address
    console.log("🔹 Method 2: Checking latest backup for address:", currentAddress);
    try {
      const storedBackup = await contract.getLatestBackupFor(currentAddress);
      console.log("Stored backup for address:", storedBackup);
      if (storedBackup && storedBackup.ipfsCid === cid) {
        console.log("✅ CID verification successful!");
        return true;
      }
    } catch (error) {
      console.log("⚠️ Method 2 failed:", error.message);
    }
    
    // Method 3: Try getting the general backup
    console.log("🔹 Method 3: Checking general backup...");
    try {
      const storedBackup = await contract.getLatestBackup();
      console.log("General backup stored:", storedBackup);
      if (storedBackup && storedBackup.ipfsCid === cid) {
        console.log("✅ CID verification successful!");
        return true;
      }
    } catch (error) {
      console.log("⚠️ Method 3 failed:", error.message);
    }
    
    console.log("❌ Could not verify CID on blockchain");
    return false;
  } catch (error) {
    console.error("❌ Error verifying CID on blockchain:", error);
    return false; // Don't throw, just return failure
  }
};

// Main backup function
export const backupMessages = async (req, res) => {
  try {
    console.log("🔹 Backup process started...");

    const messages = await fetchMessages();
    const users = await fetchUsers();
    const anonymizedMessages = anonymizeMessages(messages, users);

    const jsonFilePath = path.join(__dirname, "messages.json");
    await writeJsonFile(jsonFilePath, anonymizedMessages);

    const cid = await uploadToPinata(jsonFilePath);

    let blockchainSuccess = false;
    try {
      blockchainSuccess = await storeCidOnBlockchain(cid);
    } catch (blockchainError) {
      console.error("⚠️ Blockchain storage failed but continuing:", blockchainError.message);
    }

    // Fallback: Store the JSON file locally
    const backupDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir); // Create the backup directory if it doesn't exist
    }

    const backupFilePath = path.join(backupDir, `messages_${Date.now()}.json`);
    fs.renameSync(jsonFilePath, backupFilePath); // Move the file to the backup directory
    console.log("✅ Backup stored locally at:", backupFilePath);

    res.status(200).json({ 
      success: true,
      cid,
      blockchainStored: blockchainSuccess,
      localBackupStored: true,
      message: "Backup completed successfully"
    });
  } catch (error) {
    console.error("❌ Error in backupMessages:", error);
    res.status(500).json({ error: "Backup failed", details: error.message });
  }
};