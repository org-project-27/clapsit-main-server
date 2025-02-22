import express from 'express';
import userRouter from '#routes/api/v1/user';
import uploadRouter from '#routes/api/v1/upload';
const router = express.Router();

router.use('/user', userRouter);
router.use('/uploader', uploadRouter);

export default router;
