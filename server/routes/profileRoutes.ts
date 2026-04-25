import { Router } from 'express';
import { updateProfile } from '../controllers/profileController';
import { protect } from '../middleware/auth';

const router = Router();

router.patch('/update', protect, updateProfile);

export default router;
