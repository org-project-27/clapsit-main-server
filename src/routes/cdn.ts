import express from 'express';
import ObjectController from '~/controllers/cdn/ObjectController';

const router = express.Router();
export default router.use('/:id', ObjectController);
