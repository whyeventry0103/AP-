import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import profileRoutes from './routes/profileRoutes';

export const app = express();

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});
