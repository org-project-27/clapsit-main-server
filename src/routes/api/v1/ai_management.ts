import express from "express";
import $authenticateToken from '~/middlewares/authenticateToken';
import AIManagementController from "~/controllers/AIManagementController";

const router = express.Router();

router.use('/', $authenticateToken, AIManagementController);

export default router;