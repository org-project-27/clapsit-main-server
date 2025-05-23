import express from "express";
import $authenticateToken from '~/middlewares/authenticateToken';
import AIManagementController from "~/controllers/AIManagementController";

const router = express.Router();
router.get('/json_generator/:conversation_id', AIManagementController);
router.use('/', $authenticateToken, AIManagementController);

export default router;