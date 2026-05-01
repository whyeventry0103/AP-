import { Router } from 'express';
import { listRooms, createRoom, getRoom, joinRoom, leaveRoom } from '../controllers/roomsController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, listRooms);
router.post('/', protect, createRoom);
router.get('/:roomId', protect, getRoom);
router.post('/:roomId/join', protect, joinRoom);
router.post('/:roomId/leave', protect, leaveRoom);

export default router;
