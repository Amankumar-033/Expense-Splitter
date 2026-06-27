import {Request, Response} from 'express';
import User from '../models/User';
import OTP from '../models/OTP';
import { sendEmail } from '../utils/sendEmail';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {AuthRequest} from '../middleware/authMiddleware';

export const sendOTP = async (req: Request, res: Response) : Promise<void> => {
    try{
        const {email} = req.body;

        if(!email){
            res.status(400).json({message: "Email is required"});
            return;
        }

        const userExists = await User.findOne({email});
        
        // Agar user hai aur woh GUEST nahi hai, tabhi usko bolo ki login kare
        if(userExists && !userExists.isGuest){
            res.status(400).json({message: "User already exists. Please login"});
            return;
        }

        const otp = Math.floor(100000 + Math.random()*900000).toString();
        console.log("🚨 DEV MODE - OTP IS: ", otp);

        await OTP.findOneAndUpdate(
            {email},
            {otp},
            {upsert: true, new: true, setDefaultOnInsert: true}
        );

        await sendEmail(email, otp);
        res.status(200).json({message: "OTP sent successfully"});
    }
    catch(err){
        console.error('OTP Error', err);
        res.status(500).json({message: "Service error"});
    }
}

export const verifyOTPAndRegister = async (req: Request, res: Response): Promise<void> => {
    try{
        const {name, email, password, otp} = req.body;

        if(!name || !email || !password || !otp){
            res.status(400).json({message: "All fields are mandatory"});
            return;
        }

        const otpRecord = await OTP.findOne({email});
        if(!otpRecord){
            res.status(400).json({message: "OTP expired or not found, Please request a new one"});
            return;
        }

        if(otpRecord.otp !== otp){
            res.status(400).json({message: "Invalid OTP Provided"});
            return;
        }

        const userExists = await User.findOne({email});
        
        // 🚨 SHADOW PROFILE CLAIMING LOGIC (The Magic) 🚨
        if(userExists){
            if (userExists.isGuest) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                // 🔥 ENTERPRISE FIX: User ka khud ka daala hua naam Final "Source of Truth" banega
                // Creator ne jo temporary naam daala tha, wo yahan overwrite ho jayega.
                userExists.name = name; 
                userExists.password = hashedPassword;
                userExists.isGuest = false; 
                
                await userExists.save();
                await OTP.deleteOne({email});

                const token = jwt.sign(
                    {id: userExists._id},
                    process.env.JWT_SECRET as string,
                    {expiresIn: '7d'}
                );

                res.status(200).json({
                    _id: userExists._id,
                    name: userExists.name,
                    email: userExists.email,
                    token: token,
                    message: "Account claimed successfully! All previous trips are synced."
                });
                return;
            } else {
                res.status(400).json({message: "User already exists. Please login"});
                return;
            }
        }

        // 🚨 NORMAL REGISTRATION (Agar naya user hai) 🚨
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            isGuest: false
        });

        await OTP.deleteOne({email});

        const token = jwt.sign(
            {id: newUser._id},
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}
        );

        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            token: token,
            message: "Account successfully created!"
        });
    }
    catch(err){
        console.error("verification error", err);
        res.status(500).json({message: "Server error during Verification"});
    }
}

export const loginUser = async (req: Request, res: Response) : Promise<void> => {
    try{
        const {email, password} = req.body;

        if(!email || !password){
            res.status(400).json({message: "Email and password are mandatory"});
            return;
        }

        const user = await User.findOne({email});

        // Agar user Guest hai, toh usko pehle register karna padega (Claim account)
        if (user && user.isGuest) {
            res.status(403).json({message: "Please sign up to claim your account and view your balances."});
            return;
        }

        const isMatch =  user ? await bcrypt.compare(password, user.password!) : false;

        if(!isMatch || !user){
            res.status(401).json({message: "Incorrect email or password"});
            return;
        }

        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}
        );

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: token,
            message: `Login successful! Welcome back ${user.name}.`
        });
    }
    catch(err){
        console.error('Login failed', err);
        res.status(500).json({message: "Login failed"});
    }
}

export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try{
        const user = await User.findById(req.user.id).select('-password');
        if(user) res.status(200).json(user);
        else res.status(404).json({message: "User not found"});
    }
    catch(error){
        console.error("Profile fetch error", error);
        res.status(500).json({message: "Server error"});
    }
}


// Add this at the bottom of your authController.ts
export const updateUPI = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { upiId } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
             res.status(404).json({ message: "User not found" });
             return;
        }

        user.upiId = upiId;
        await user.save();

        res.status(200).json({ message: "UPI ID updated successfully", upiId: user.upiId });
    } catch (error) {
        res.status(500).json({ message: "Server error updating UPI" });
    }
}