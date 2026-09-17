import express from "express";
import {
  getAllContacts,
  getChatPartners,
  getMessagesByUserId,
  sendMessage,
  reactToMessage,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Authenticate user for all message operations without external latency overhead
router.use(protectRoute);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", getMessagesByUserId);
router.post("/send/:id", sendMessage);
router.put("/react/:id", reactToMessage);
router.put("/read/:id", markMessagesAsRead);
router.put("/edit/:id", editMessage);
router.delete("/delete/:id", deleteMessage);

export default router;
