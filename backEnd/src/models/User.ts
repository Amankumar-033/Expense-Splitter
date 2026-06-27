import mongoose, {Schema, Document} from 'mongoose';

export interface IUser extends Document{
    name: string;
    email: string;
    password?: string;
    isGuest?: boolean; 
    upiId?: string; // 🔥 NEW: Real UPI ID
}

const UserSchema: Schema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false 
    },
    isGuest: {
        type: Boolean,
        default: false 
    },
    upiId: {
        type: String,
        default: "" // By default empty
    }
},{
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);