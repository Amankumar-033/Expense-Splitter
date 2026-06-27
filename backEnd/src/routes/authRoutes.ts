import express from 'express';
import { sendOTP, verifyOTPAndRegister, loginUser, getUserProfile, updateUPI} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';


const router = express.Router();
router.post('/login', loginUser);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTPAndRegister);
router.get('/profile', protect, getUserProfile);
router.put('/update-upi', protect, updateUPI);;

export default router;