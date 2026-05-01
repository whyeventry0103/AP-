import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: './config.env' });

import authRoutes  from './routes/authRoutes';
import userRoutes  from './routes/userRoutes';
import statsRoutes from './routes/statsRoutes';
import { initSocketHandler } from './utils/socketHandler';

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: 'http://localhost:5174', credentials: true },
});

app.use(cors({ origin: 'http://localhost:5174', credentials: true }));
app.use(express.json());

app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

initSocketHandler(io);

mongoose.connect(process.env.MONGO_URI!).then(() => {
  server.listen(process.env.PORT || 8001, () => {
    console.log(`Server running on port ${process.env.PORT || 8001}`);
  });
}).catch(err => console.error('DB connection failed:', err));
