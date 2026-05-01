import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import profileRoutes from './routes/profileRoutes';
import statsRoutes from './routes/statsRoutes';
import roomsRoutes from './routes/roomsRoutes';

export const app = express();

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rooms', roomsRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});
