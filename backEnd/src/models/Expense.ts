import mongoose, {Document, Schema} from 'mongoose';

export interface IPayer {
    user: mongoose.Types.ObjectId;
    amount: number;
}

export interface ISplit {
    user: mongoose.Types.ObjectId;
    amountOwed: number;
}

export interface IExpense extends Document {
    title: string;
    description?: string;
    totalAmount: number;
    category: string;
    splitType: string;
    groupId?: mongoose.Types.ObjectId;
    payers: IPayer[];
    splits: ISplit[];
    createdBy: mongoose.Types.ObjectId;
    isDeleted: boolean;
    settlementStatus?: 'PENDING' | 'SETTLED' | 'REJECTED'; // 🔥 NEW: State management
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const payerSchema = new Schema<IPayer>({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    amount: {type: Number, required: true, min: 0}
}, { _id: false});

const splitSchema = new Schema<ISplit>({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    amountOwed: {type: Number, required: true, min: 0}
}, {_id: false});

const expenseSchema = new Schema<IExpense>({
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    totalAmount: { type: Number, required: true, min: 0 }, 
    category: {
        type: String,
        enum: ['FOOD', 'TRAVEL', 'ACCOMODATION', 'ENTERTAINMENT', 'GENERAL', 'SETTLEMENT'],
        default: 'GENERAL',
        uppercase: true
    },
    splitType: {
        type: String,
        enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'],
        default: 'EXACT',
        uppercase: true
    },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: false },
    isDeleted: { type: Boolean, default: false },
    payers: {
        type: [payerSchema], required: true,
        validate: [(v: IPayer[]) => v.length > 0, 'At least one participant is required']
    },
    splits: {
        type: [splitSchema], required: true,
        validate: [(v: ISplit[]) => v.length > 0, 'At least one participant is required']
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 🔥 NEW: Settlement Tracking
    settlementStatus: {
        type: String,
        enum: ['PENDING', 'SETTLED', 'REJECTED'],
        default: 'SETTLED' // Normal expenses naturally SETTLED hotay hain
    },
    date: { type: Date, default: Date.now }
}, {timestamps :true});

export default mongoose.model<IExpense>('Expense', expenseSchema);