import { Router } from 'express';
import { getLeaderboard, getHistory } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/leaderboard', requireAuth, getLeaderboard);
router.get('/history',     requireAuth, getHistory);

export default router;
