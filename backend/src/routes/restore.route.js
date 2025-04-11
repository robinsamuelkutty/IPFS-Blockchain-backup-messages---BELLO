import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { restoreMessages, restoreUsers } from "../controllers/restore.controller.js";

const router = express.Router();

// Route to restore messages
router.post("/messages", protectRoute, restoreMessages);

// Route to restore users (if MongoDB fails)
router.post("/users", restoreUsers);

export default router;
