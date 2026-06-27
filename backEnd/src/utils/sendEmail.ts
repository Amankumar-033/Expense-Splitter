import nodemailer from 'nodemailer';

// Existing OTP Function
export const sendEmail = async (email: string, otp: string) => {
    try{
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your verification Code - SmartSplit',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to SmartSplit!</h2>
                    <p>Please use the following 6-digit code to verify your account:</p>
                    <h1 style="background: #f4f4f4; padding: 10px; letter-spacing: 5px; color: #333;">${otp}</h1>
                    <p style="color: red; font-size: 12px;">Note: This code will expire in 5 minutes.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Success: OTP email sent to ${email}`);
    }
    catch(err){
        console.error("Error sending mail", err);
    }
}

// 🔥 NEW: Premium Enterprise Invite Email Function 🔥
export const sendGroupInviteEmail = async (email: string, inviterName: string, groupName: string, isGuest: boolean) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Email Template HTML
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `You've been added to "${groupName}" on SmartSplit!`,
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(to right, #10b981, #3b82f6); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">SmartSplit</h1>
                </div>
                <div style="padding: 40px 30px; background-color: #ffffff; color: #374151;">
                    <h2 style="margin-top: 0; color: #111827; font-size: 22px;">You've been invited! 🎉</h2>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                        <strong>${inviterName}</strong> just added you to the group <strong style="color: #4f46e5;">"${groupName}"</strong> to split expenses.
                    </p>
                    
                    ${isGuest ? `
                    <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0; font-size: 15px; color: #4b5563;">
                            Your share of the expenses is already being tracked! <strong>Sign up using this exact email address</strong> to automatically sync your balances.
                        </p>
                    </div>
                    <div style="text-align: center;">
                        <a href="${frontendUrl}/signup" style="background: linear-gradient(to right, #10b981, #3b82f6); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">Claim Your Account</a>
                    </div>
                    ` : `
                    <div style="text-align: center;">
                        <a href="${frontendUrl}/login" style="background: linear-gradient(to right, #10b981, #3b82f6); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">View Group Dashboard</a>
                    </div>
                    `}
                    
                    <p style="font-size: 14px; color: #9ca3af; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                        Cheers,<br><strong style="color: #4b5563;">The SmartSplit Team</strong>
                    </p>
                </div>
            </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Success: Premium Invite email sent to ${email}`);
    } catch (err) {
        console.error("Error sending invite mail", err);
    }
}