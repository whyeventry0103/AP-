import { Router } from 'express';
import { getLeaderboard, getHistory } from '../controllers/gameController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/leaderboard', protect, getLeaderboard);
router.get('/history', protect, getHistory);

export default router;
