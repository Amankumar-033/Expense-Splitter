import express from "express";
import { addMemberToGroup, createGroup, getUserGroups, deleteGroup } from "../controllers/groupController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post('/create', protect, createGroup);
router.get('/my-groups', protect, getUserGroups);
router.put('/:groupId/add-member', protect, addMemberToGroup);
router.delete('/:groupId', protect, deleteGroup); // 🔥 Naya Delete Route Add Kiya

export default router;