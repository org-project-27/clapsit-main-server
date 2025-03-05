import express from 'express';
import userRouter from '#routes/api/v1/user';
import uploadRouter from '#routes/api/v1/upload';
import healthRouter from '#routes/api/v1/health';
import aiManagementRouter from '#routes/api/v1/ai_management';

const router = express.Router();

router.use('/user', userRouter);
router.use('/uploader', uploadRouter);
router.use('/health', healthRouter);
router.use('/aim', aiManagementRouter);

export default router;
