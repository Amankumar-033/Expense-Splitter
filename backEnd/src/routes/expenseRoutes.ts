import express from 'express';
import { addExpense, getGroupExpenses, getGroupSettlementPlan, getMyExpense, getUsersDashboard, settleUp, approveSettlement, rejectSettlement, parseReceiptAI } from '../controllers/expenseController';
import { protect } from '../middleware/authMiddleware';
import { requireGroupMember } from '../middleware/groupMiddleware';
import multer from 'multer';


// 5 MB cap so an oversized upload can't sit in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});
const router = express.Router();

router.post('/add', protect, requireGroupMember, addExpense);
router.get('/my-expenses', protect, getMyExpense);
router.get('/group/:groupId', protect, requireGroupMember, getGroupExpenses);
router.get('/dashboard', protect, getUsersDashboard);
router.post('/settle', protect, requireGroupMember, settleUp);
router.get('/group/:groupId/settle-plan', protect, requireGroupMember, getGroupSettlementPlan);


router.put('/:settlementId/approve', protect, approveSettlement);
router.put('/:settlementId/reject', protect, rejectSettlement);

router.post('/parse-receipt', protect, upload.single('receipt'), parseReceiptAI)

export default router;