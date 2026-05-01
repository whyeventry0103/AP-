import { Router } from 'express';
import { getStats } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getStats);

export default router;
