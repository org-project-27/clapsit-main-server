import express from 'express';
import userRouter from '#routes/api/v1/user';
import uploadRouter from '#routes/api/v1/upload';
import healthRouter from '#routes/api/v1/health';

const router = express.Router();

router.use('/user', userRouter);
router.use('/uploader', uploadRouter);
router.use('/health', healthRouter);

export default router;
