import express from 'express';
import { addExpense, getGroupExpenses, getGroupSettlementPlan, getMyExpense, getUsersDashboard, settleUp, approveSettlement, rejectSettlement, parseReceiptAI } from '../controllers/expenseController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';


const upload = multer({ storage: multer.memoryStorage()});
const router = express.Router();

router.post('/add', protect, addExpense);
router.get('/my-expenses', protect, getMyExpense);
router.get('/group/:groupId', protect, getGroupExpenses);
router.get('/dashboard', protect, getUsersDashboard);
router.post('/settle', protect, settleUp);
router.get('/group/:groupId/settle-plan', protect, getGroupSettlementPlan);


router.put('/:settlementId/approve', protect, approveSettlement);
router.put('/:settlementId/reject', protect, rejectSettlement);

router.post('/parse-receipt', protect, upload.single('receipt'), parseReceiptAI)

export default router;