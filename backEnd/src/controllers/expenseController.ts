import { Response } from "express";
import Expense from "../models/Expense";
import { AuthRequest } from "../middleware/authMiddleware";
import Group from "../models/Group";
import { minimizeCashFlow } from '../utils/minimizeTransactions';
import { toPaise, toRupees } from '../utils/money';
import { GoogleGenAI } from "@google/genai";
import axios from 'axios';
import FormData from 'form-data';

// Reliable string ID extractor
const getRawId = (id: any): string => {
    return String(id && id._id ? id._id : id).trim();
};

export const addExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, totalAmount, groupId, payers, splits, splitType } = req.body;

        // ---- The ledger only works if every expense is zero-sum, so enforce it here ----
        const totalPaise = toPaise(totalAmount);
        if (!Number.isFinite(totalPaise) || totalPaise <= 0) {
            res.status(400).json({ message: "Total amount must be a positive number" });
            return;
        }
        if (!Array.isArray(payers) || payers.length === 0 || !Array.isArray(splits) || splits.length === 0) {
            res.status(400).json({ message: "At least one payer and one split are required" });
            return;
        }

        const payersPaise = payers.reduce((sum: number, p: any) => sum + toPaise(p.amount), 0);
        if (payersPaise !== totalPaise) {
            res.status(400).json({ message: "Payer amounts must add up to the total amount" });
            return;
        }

        // ---- Build the splits in integer paise so they always sum to the total ----
        let splitsPaise: number[];
        if (splitType === 'EQUAL') {
            // ₹100 across 3 people becomes 3334 + 3333 + 3333 paise, never 33.33 x 3 = 99.99
            const base = Math.floor(totalPaise / splits.length);
            const remainder = totalPaise - base * splits.length;
            splitsPaise = splits.map((_: any, i: number) => base + (i < remainder ? 1 : 0));
        } else {
            splitsPaise = splits.map((s: any) => toPaise(s.amountOwed));
            const drift = totalPaise - splitsPaise.reduce((a, b) => a + b, 0);
            // A percentage split can land a few paise off; absorb that, reject anything bigger
            if (!Number.isFinite(drift) || Math.abs(drift) > splits.length) {
                res.status(400).json({ message: "Split amounts must add up to the total amount" });
                return;
            }
            splitsPaise[0] += drift;
        }

        const processedSplits = splits.map((s: any, i: number) => ({
            user: s.user,
            amountOwed: toRupees(splitsPaise[i])
        }));

        const newExpense = new Expense({
            title, totalAmount, groupId, payers, 
            splits: processedSplits, splitType, createdBy: req.user.id
        });

        await newExpense.save();

        const io = req.app.get('io');
        if (io && groupId) {
            io.to(getRawId(groupId)).emit('group_data_changed'); 
            const group = await Group.findById(groupId);
            if (group) {
                group.members.forEach((memberId: any) => {
                    io.to(getRawId(memberId)).emit('dashboard_update'); 
                });
            }
        }

        res.status(201).json({ message: "Expense added", expense: newExpense });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to add expense" });
        return;
    }
};

export const getMyExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const expenses = await Expense.find({
            $or: [
                { createdBy: req.user.id },
                { 'payers.user': req.user.id },
                { 'splits.user': req.user.id }
            ]
        })
        .populate('createdBy', 'name email')
        .populate('payers.user', 'name email')
        .populate('splits.user', 'name email')
        .sort({ createdAt: -1 });

        res.status(200).json(expenses);
        return;
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        return;
    }
};

export const getGroupExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        
        if (!group || group.isDeleted) {
            res.status(404).json({ message: "Group not found" });
            return;
        }

        const expenses = await Expense.find({ groupId, isDeleted: false })
            .populate('createdBy', 'name email')
            .populate('payers.user', 'name upiId')
            .populate('splits.user', 'name upiId')
            .sort({ createdAt: -1 });

        res.status(200).json({ expenses });
        return;
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        return;
    }
};

export const getUsersDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        
        const groups = await Group.find({ members: userId, isDeleted: false });
        const groupIds = groups.map(g => g._id);

        const expenses = await Expense.find({
            isDeleted: false,
            settlementStatus: { $ne: 'PENDING' },
            $or: [
                { groupId: { $in: groupIds } },
                { 'payers.user': userId },
                { 'splits.user': userId }
            ]
        }).populate('payers.user splits.user', 'name upiId');

        const netBalances = new Map<string, number>();
        const userNames = new Map<string, string>();

        expenses.forEach(exp => {
            if (exp.settlementStatus === 'REJECTED') return;
            
            exp.payers.forEach(p => {
                if (!p.user) return;
                const id = getRawId(p.user);
                netBalances.set(id, (netBalances.get(id) || 0) + Number(p.amount));
                userNames.set(id, (p.user as any).name);
            });
            exp.splits.forEach(s => {
                if (!s.user) return;
                const id = getRawId(s.user);
                netBalances.set(id, (netBalances.get(id) || 0) - Number(s.amountOwed));
                userNames.set(id, (s.user as any).name);
            });
        });

        const optimized = minimizeCashFlow(netBalances);

        let totalOwesYou = 0;
        let totalYouOwe = 0;
        const friendBalancesMap = new Map<string, { name: string, amount: number }>();

        optimized.forEach(tx => {
            if (tx.from === userId) {
                totalYouOwe += tx.amount;
                const existing = friendBalancesMap.get(tx.to) || { name: userNames.get(tx.to) || 'Unknown', amount: 0 };
                existing.amount -= tx.amount;
                friendBalancesMap.set(tx.to, existing);
            } else if (tx.to === userId) {
                totalOwesYou += tx.amount;
                const existing = friendBalancesMap.get(tx.from) || { name: userNames.get(tx.from) || 'Unknown', amount: 0 };
                existing.amount += tx.amount;
                friendBalancesMap.set(tx.from, existing);
            }
        });

        const friendBalances = Array.from(friendBalancesMap.entries()).map(([id, data]) => ({
            id,
            name: data.name,
            amount: Math.round(data.amount * 100) / 100
        }));

        res.status(200).json({ 
            summary: { 
                totalOwesYou: Math.round(totalOwesYou * 100) / 100, 
                totalYouOwe: Math.round(totalYouOwe * 100) / 100,
                netBalance: Math.round((totalOwesYou - totalYouOwe) * 100) / 100
            }, 
            friendBalances 
        });
        return;
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ message: "Server error" });
        return;
    }
};

export const settleUp = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { payerId, receiverId, amount, groupId } = req.body;

        // You can only claim a payment you made yourself - otherwise anyone could
        // fabricate settlements between two other people.
        if (String(payerId) !== req.user.id) {
            res.status(403).json({ message: "You can only record a settlement that you paid" });
            return;
        }
        if (!receiverId || String(receiverId) === String(payerId)) {
            res.status(400).json({ message: "Invalid settlement receiver" });
            return;
        }

        const amountPaise = toPaise(amount);
        if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
            res.status(400).json({ message: "Settlement amount must be a positive number" });
            return;
        }
        const settledAmount = toRupees(amountPaise);

        const settlement = await Expense.create({
            title: "Settlement Request",
            totalAmount: settledAmount,
            category: 'SETTLEMENT',
            splitType: 'EXACT',
            groupId: groupId || null,
            payers: [{ user: payerId, amount: settledAmount }],
            splits: [{ user: receiverId, amountOwed: settledAmount }],
            createdBy: req.user.id,
            settlementStatus: 'PENDING'
        });

        const io = req.app.get('io');
        if (io && groupId) {
            io.to(getRawId(groupId)).emit('group_data_changed');
            const group = await Group.findById(groupId);
            if (group) {
                group.members.forEach((memberId: any) => {
                    io.to(getRawId(memberId)).emit('dashboard_update');
                });
            }
        } else if (io) {
            io.to(payerId).emit('dashboard_update');
            io.to(receiverId).emit('dashboard_update');
        }

        res.status(201).json({ message: "Settlement request sent", settlement });
        return;
    } catch (error) {
        res.status(500).json({ message: "Settlement failed" });
        return;
    }
};

export const approveSettlement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { settlementId } = req.params;

        // One atomic compare-and-swap: find it, check it is still PENDING and that
        // the caller is the receiver, and flip it - all in a single DB round trip.
        // A read-then-save would let two concurrent approvals both succeed.
        const settlement = await Expense.findOneAndUpdate(
            {
                _id: settlementId,
                category: 'SETTLEMENT',
                settlementStatus: 'PENDING',
                'splits.0.user': req.user.id
            },
            { $set: { settlementStatus: 'SETTLED', title: "Settlement Completed" } },
            { new: true }
        );

        if (!settlement) {
            res.status(409).json({ message: "Settlement not found, already processed, or not yours to approve" });
            return;
        }

        const receiverId = getRawId(settlement.splits[0].user);
        const io = req.app.get('io');
        if (io) {
            if (settlement.groupId) io.to(getRawId(settlement.groupId)).emit('group_data_changed');
            io.to(getRawId(settlement.payers[0].user)).emit('dashboard_update');
            io.to(receiverId).emit('dashboard_update');
        }

        res.status(200).json({ message: "Settlement approved" }); return;
    } catch (error) {
        res.status(500).json({ message: "Failed to approve" }); return;
    }
};

export const rejectSettlement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { settlementId } = req.params;

        // Same atomic compare-and-swap as approve
        const settlement = await Expense.findOneAndUpdate(
            {
                _id: settlementId,
                category: 'SETTLEMENT',
                settlementStatus: 'PENDING',
                'splits.0.user': req.user.id
            },
            { $set: { settlementStatus: 'REJECTED', title: "Settlement Rejected" } },
            { new: true }
        );

        if (!settlement) {
            res.status(409).json({ message: "Settlement not found, already processed, or not yours to reject" });
            return;
        }

        const receiverId = getRawId(settlement.splits[0].user);
        const io = req.app.get('io');
        if (io) {
            if (settlement.groupId) io.to(getRawId(settlement.groupId)).emit('group_data_changed');
            io.to(getRawId(settlement.payers[0].user)).emit('dashboard_update');
            io.to(receiverId).emit('dashboard_update');
        }

        res.status(200).json({ message: "Settlement rejected" }); return;
    } catch (error) {
        res.status(500).json({ message: "Failed to reject" }); return;
    }
};

export const getGroupSettlementPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const expenses = await Expense.find({ 
            groupId, 
            isDeleted: false,
            settlementStatus: { $ne: 'PENDING' }
        }).populate('payers.user splits.user', 'name upiId');

        const netBalances = new Map<string, number>();
        const userDetails = new Map<string, {name: string, upiId: string}>(); 

        expenses.forEach(exp => {
            if (exp.settlementStatus === 'REJECTED') return;

            exp.payers.forEach(p => {
                if (!p.user) return;
                const id = getRawId(p.user);
                netBalances.set(id, (netBalances.get(id) || 0) + Number(p.amount));
                userDetails.set(id, { name: (p.user as any).name, upiId: (p.user as any).upiId || "" });
            });
            exp.splits.forEach(s => {
                if (!s.user) return;
                const id = getRawId(s.user);
                netBalances.set(id, (netBalances.get(id) || 0) - Number(s.amountOwed));
                userDetails.set(id, { name: (s.user as any).name, upiId: (s.user as any).upiId || "" });
            });
        });

        const optimized = minimizeCashFlow(netBalances);
        
        const finalSettlementPlan = optimized.map(tx => ({
            from: { id: tx.from, name: userDetails.get(tx.from)?.name || "Unknown" },
            to: { 
                id: tx.to, 
                name: userDetails.get(tx.to)?.name || "Unknown",
                upiId: userDetails.get(tx.to)?.upiId || "" 
            },
            amount: Math.round(tx.amount * 100) / 100
        }));

        res.status(200).json({ settlements: finalSettlementPlan });
        return;
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        return;
    }
};




export const parseReceiptAI = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No image provided" });
            return;
        }

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        // ==========================================
        // 🚀 PLAN A: GOOGLE GEMINI AI
        // ==========================================
        try {
            console.log("🚀 PLAN A: Trying Google Gemini AI...");
            const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
            
            if (!apiKey) throw new Error("No API Key found for Gemini");

            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Analyze this receipt image. Extract store name as 'title' and total amount as 'amount' (number only). Return strictly JSON: {"title": "Store", "amount": 1200}. No extra text.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [prompt, imagePart]
            });

            const responseText = (response as any).text || "";
            const match = responseText.match(/\{[\s\S]*\}/);
            
            if (match) {
                const parsedData = JSON.parse(match[0]);
                console.log("✅ SUCCESS (Plan A - Gemini AI):", parsedData);
                res.status(200).json(parsedData);
                return; // Agar ye chal gaya, toh aage ka code nahi chalega!
            } else {
                throw new Error("Invalid JSON format from Gemini");
            }
        } catch (aiError: any) {
            console.warn(`⚠️ PLAN A FAILED: ${aiError.message}. Switching to Plan B (OCR)...`);
        }

        // ==========================================
        // 🛡️ PLAN B: FREE OCR + REGEX FALLBACK
        // ==========================================
        console.log("🚀 PLAN B: Starting Free OCR Fallback...");
        
        const form = new FormData();
        form.append('file', req.file.buffer, { filename: 'receipt.jpg', contentType: req.file.mimetype });
        form.append('language', 'eng');
        form.append('isOverlayRequired', 'false');

        const response = await axios.post('https://api.ocr.space/parse/image', form, {
            headers: {
                ...form.getHeaders(),
                'apikey': 'helloworld' // Public Test Key
            }
        });

        const textResult = response.data.ParsedResults?.[0]?.ParsedText || "";
        
        if (!textResult) {
            throw new Error("OCR could not extract text from the image.");
        }

        // Find the biggest number for the amount
        const numberMatches = textResult.match(/\d+(?:,\d{3})*(?:\.\d{2})?/g);
        let maxAmount = 0;
        if (numberMatches) {
            const numbers = numberMatches.map((n: string) => parseFloat(n.replace(/,/g, '')));
            maxAmount = Math.max(...numbers);
        }

        // Get the first valid line for the title
        const lines = textResult.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 3 && !l.match(/^\d/));
        const title = lines.length > 0 ? lines[0].substring(0, 30) : "Scanned Receipt";

        const parsedData = {
            title,
            amount: maxAmount > 0 ? maxAmount : null
        };

        console.log("✅ SUCCESS (Plan B - OCR Fallback):", parsedData);
        res.status(200).json(parsedData);

    } catch (error: any) {
        // Agar kismat hi kharab hui aur dono fail ho gaye
        console.error("🚨 COMPLETE FAILURE:", error.message || error);
        res.status(500).json({ message: "Failed to read receipt using both AI and OCR systems." });
    }
};