import mongoose, {Document, Schema} from 'mongoose';

export interface IGroup extends Document {
    name: string;
    description?: string;
    members: mongoose.Types.ObjectId[];
    currency: string;
    createdBy: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}



const groupSchema = new Schema<IGroup>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    currency: {
        type: String,
        default: 'INR',
        uppercase: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});


export default mongoose.model<IGroup>('Group', groupSchema);