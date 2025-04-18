
## Blockchain and IPFS for Secure Message Backup


##  Overview

This project showcases a decentralized, secure, and user-controlled method for instant message backup and recovery using **IPFS** and **Blockchain** technologies.



---

##  How It Works

### 1. ** Packaging**

- Encrypted messages are collected and converted into a **single JSON file**.

### 2. **Decentralized Storage using IPFS**
- The JSON file is uploaded to **IPFS** using **Pinata**, a pinning service.
- IPFS (InterPlanetary File System) is a **peer-to-peer decentralized file storage system** that:
  - Provides **high availability** and **tamper-proof** storage.
  - Eliminates centralized points of failure.
  - Returns a unique **Content Identifier (CID)** for every file uploaded.

### 3. **Blockchain Integration**
- The generated CID is recorded on the **Ethereum blockchain** using **Ganache** (a local blockchain simulator).
- Blockchain storage ensures:
  - **Immutability**: CIDs cannot be altered or deleted.
  - **Auditability**: Users can verify backups with confidence.

### 4. **Recovery Process**
- In case of device loss or data corruption:
  - The CID is fetched from the blockchain.
  - The encrypted JSON is retrieved from IPFS using the CID.
  - **Decryption occurs locally** using the user's private key.

---

##  Key Features

  

-  Blockchain-based Backup Verification  
-  Local Ganache Network for Blockchain Simulation  
-  IPFS File Upload via Pinata  
-  Secure and Tamper-Proof Recovery  

---


