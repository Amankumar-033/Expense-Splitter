import { Response, NextFunction } from 'express';
import Group from '../models/Group';
import { AuthRequest } from './authMiddleware';

const getRawId = (id: any): string => {
    return String(id && id._id ? id._id : id).trim();
};

/**
 * Blocks a request unless the logged-in user is actually a member of the group
 * being touched. Without this, any authenticated user could read or write any
 * group's ledger just by knowing its ObjectId.
 *
 * The group id may arrive in the URL (/group/:groupId) or the body (add expense),
 * and some expenses are personal with no group at all - those are let through.
 */
export const requireGroupMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const groupId = req.params.groupId || req.body.groupId;

        if (!groupId) {
            next();
            return;
        }

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) {
            res.status(404).json({ message: "Group not found" });
            return;
        }

        const isMember = group.members.some(member => getRawId(member) === req.user.id);
        if (!isMember) {
            res.status(403).json({ message: "Not authorized to access this group" });
            return;
        }

        next();
    } catch (error) {
        // Covers a malformed ObjectId, which makes findById throw a CastError
        res.status(400).json({ message: "Invalid group id" });
    }
};
