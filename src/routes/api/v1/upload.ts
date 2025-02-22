import express from 'express';
const router = express.Router();
import $authenticateToken from '~/middlewares/authenticateToken';
import BaseUploadController from '~/controllers/BaseUploadController';
import { $uploader } from '~/assets/helpers/methods';

router.use('/', $authenticateToken, $uploader('example'), BaseUploadController);
export default router;
