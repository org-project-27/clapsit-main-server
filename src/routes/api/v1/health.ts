import express from "express";
import HealthController from "~/controllers/HealthController";

const router = express.Router();

router.use('/', HealthController);

export default router;