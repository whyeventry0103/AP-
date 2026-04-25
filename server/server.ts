import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { app } from './app';
import { setupSocket } from './utils/socketHandler';

config({ path: './config.env' });

const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ludo_game';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});

setupSocket(io);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
