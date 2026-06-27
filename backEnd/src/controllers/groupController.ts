import { Response } from "express";
import Group from "../models/Group";
import User from "../models/User";
import Expense from "../models/Expense"; 
import { AuthRequest } from "../middleware/authMiddleware";
import { sendGroupInviteEmail } from "../utils/sendEmail"; 

// 🔥 ENTERPRISE FIX: Bulletproof ID Extractor
const getRawId = (id: any): string => {
    return String(id && id._id ? id._id : id).trim();
};

export const createGroup = async (req: AuthRequest, res: Response) : Promise<void> => {
    try{
        const {name, description, members} = req.body;

        if(!name){
            res.status(400).json({message: "Group name is required"});
            return;
        }

        let groupMembers = members || [];
        if(!groupMembers.includes(req.user.id)){
            groupMembers.push(req.user.id);
        }
        groupMembers = [...new Set(groupMembers)];

        const newGroup = await Group.create({
            name,
            description,
            members: groupMembers,
            createdBy: req.user.id
        });

        // 🔥 GLOBAL REAL-TIME SYNC 🔥
        const io = req.app.get('io');
        if (io) {
            newGroup.members.forEach((memberId: any) => {
                const room = getRawId(memberId);
                console.log(`📢 [createGroup] Emitting dashboard_update to: ${room}`);
                io.to(room).emit('dashboard_update');
            });
        }

        res.status(201).json({
            message: "Group created successfully",
            group: newGroup
        });
    }
    catch(error){
        console.error("Create group error: ", error);
        res.status(500).json({message: "Server error during group creation"});
    }
}

export const getUserGroups = async (req: AuthRequest, res: Response): Promise<void> => {
    try{
        const userId = req.user.id;
        const groups = await Group.find({
            members: userId,
            isDeleted: false
        })
        .populate('members', 'name email')
        .populate('createdBy', 'name')
        .sort({updatedAt: -1});

        res.status(200).json({
            message: "Groups fetched successfully",
            count: groups.length,
            groups
        });
    }
    catch(error){
        console.error("Get user groups error", error);
        res.status(500).json({message: "Server error fetching groups"});
    }
}

export const addMemberToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
    try{
        const {groupId} = req.params;
        const {email, name} = req.body; 

        if(!email || !name){
            res.status(400).json({message: "Email and Name are required to add a member"});
            return;
        }

        const group = await Group.findById(groupId);
        if(!group || group.isDeleted){
            res.status(404).json({message: "Group not found"});
            return;
        }

        const isRequesterMember = group.members.some(member => getRawId(member) === req.user.id);
        if(!isRequesterMember){
            res.status(403).json({message: "Not authorized to add members to this group"});
            return;
        }

        let userToAdd = await User.findOne({ email });
        let isNewGhost = false;

        if (!userToAdd) {
            userToAdd = await User.create({
                name,
                email,
                isGuest: true 
            });
            isNewGhost = true;
        }

        const isAlreadyMember = group.members.some(member => getRawId(member) === getRawId(userToAdd?._id));
        if(isAlreadyMember){
            res.status(400).json({message: "User is already a member of this group"});
            return;
        }

        group.members.push(userToAdd._id);
        await group.save();

        try {
            const inviter = await User.findById(req.user.id);
            const inviterName = inviter ? inviter.name : "A friend";
            sendGroupInviteEmail(email, inviterName, group.name, Boolean(userToAdd.isGuest || isNewGhost))
                .catch(err => console.error("Failed to send invite email", err));
        } catch (err) {
            console.error("Error fetching inviter details", err);
        }

        // 🔥 GLOBAL REAL-TIME SYNC 🔥
        const io = req.app.get('io');
        if (io) {
            const groupRoom = getRawId(groupId);
            console.log(`📢 [addMember] Emitting group_data_changed to: ${groupRoom}`);
            io.to(groupRoom).emit('group_data_changed');
            
            group.members.forEach((memberId: any) => {
                const userRoom = getRawId(memberId);
                console.log(`📢 [addMember] Emitting dashboard_update to: ${userRoom}`);
                io.to(userRoom).emit('dashboard_update');
            });
        }

        res.status(200).json({
            message: userToAdd.isGuest ? "Guest user added successfully" : "User added successfully",
            group,
            addedUser: { _id: userToAdd._id, name: userToAdd.name, email: userToAdd.email } 
        });
    }
    catch(error){
        console.error("Add member error", error);
        res.status(500).json({message: "Server error during adding member to the group"});
    }
}

export const deleteGroup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);

        if (!group || group.isDeleted) {
            res.status(404).json({ message: "Group not found" });
            return;
        }

        const creatorId = getRawId(group.createdBy);
        if (creatorId !== req.user.id) {
            res.status(403).json({ message: "Only the group creator can delete this group." });
            return;
        }

        const expenses = await Expense.find({ groupId, isDeleted: false });
        const netBalances = new Map<string, number>();

        expenses.forEach((exp: any) => {
            exp.payers.forEach((p: any) => {
                if (!p.user) return;
                const id = getRawId(p.user);
                netBalances.set(id, (netBalances.get(id) || 0) + Number(p.amount));
            });
            exp.splits.forEach((s: any) => {
                if (!s.user) return;
                const id = getRawId(s.user);
                netBalances.set(id, (netBalances.get(id) || 0) - Number(s.amountOwed));
            });
        });

        let hasPendingDebts = false;
        for (const [_, balance] of netBalances.entries()) {
            if (Math.abs(balance) > 0.01) {
                hasPendingDebts = true;
                break;
            }
        }

        if (hasPendingDebts) {
            res.status(400).json({ message: "Cannot delete group. Please settle all balances first." });
            return;
        }

        group.isDeleted = true;
        await group.save();
        await Expense.updateMany({ groupId }, { isDeleted: true });

        // 🔥 GLOBAL REAL-TIME SYNC 🔥
        const io = req.app.get('io');
        if (io) {
            const groupRoom = getRawId(groupId);
            io.to(groupRoom).emit('group_data_changed');
            
            group.members.forEach((memberId: any) => {
                const userRoom = getRawId(memberId);
                io.to(userRoom).emit('dashboard_update');
            });
        }

        res.status(200).json({ message: "Group deleted successfully" });
        return;
    } catch (error) {
        console.error("Delete group error", error);
        res.status(500).json({ message: "Server error during group deletion" });
        return;
    }
};