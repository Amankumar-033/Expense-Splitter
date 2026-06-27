import express, {Request, Response} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from '../src/routes/authRoutes';
import expensesRoutes from './routes/expenseRoutes';
import groupRoutes from './routes/groupRoutes';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI  = process.env.MONGO_URI;

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // For Group Pages
    socket.on('join_group', (groupId) => {
        const id = String(groupId).trim();
        socket.join(id);
        console.log(`📦 Socket ${socket.id} joined Group Room: ${id}`);
    });

    socket.on('leave_group', (groupId) => {
        socket.leave(String(groupId).trim());
    });

    // 🔥 FIXED: For Global Dashboard Sync (Personal User Room)
    socket.on('join_user_room', (userId) => {
        const id = String(userId).trim();
        socket.join(id);
        console.log(`👤 Socket ${socket.id} joined User Room: ${id}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

app.use(cors());
app.use(express.json());

if(!MONGO_URI){
    console.error("Error: MongoURI is missing, connection failed");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection failed", err));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/groups', groupRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Home page of Expense splitter app');
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});