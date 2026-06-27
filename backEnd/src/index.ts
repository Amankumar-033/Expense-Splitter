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
const MONGO_URI = process.env.MONGO_URI;
// Apne frontend ka URL yahan se utha rahe hain
const FRONTEND_URL = process.env.FRONTEND_URL || "https://expense-splitter-frontend-mqg9.onrender.com";

const httpServer = createServer(app);

// CORS Config for both Express and Socket.io
const corsOptions = {
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
};

const io = new Server(httpServer, {
    cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);
    
    socket.on('join_group', (groupId) => {
        socket.join(String(groupId).trim());
    });

    socket.on('join_user_room', (userId) => {
        socket.join(String(userId).trim());
    });

    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

if(!MONGO_URI){
    console.error("Error: MongoURI is missing");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection failed", err));

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/groups', groupRoutes);

app.get('/', (req, res) => { res.send('API is running'); });

// IMPORTANT: httpServer.listen use karna hai, app.listen nahi!
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});