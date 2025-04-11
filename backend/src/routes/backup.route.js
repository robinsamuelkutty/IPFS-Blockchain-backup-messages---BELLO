import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { backupMessages } from "../controllers/backup.controller.js";

const router = express.Router();

// Route to back up messages
router.post("/messages", protectRoute, backupMessages);

export default router;
