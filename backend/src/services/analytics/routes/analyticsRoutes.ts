import express, { Router } from 'express';
import analyticsContainer from '../Dependencies/dependencies';
import authenticate from '../../../shared/middlewares/authenticate';
import { analyticsLimiter } from '../../../shared/middlewares/rateLimiter';

const router: Router = express.Router();
const { analyticsController } = analyticsContainer.controllers;

router.use(authenticate);
router.use(analyticsLimiter);

router.get("/stats", (req, res, next) => analyticsController.getStats(req, res, next));

router.get("/dashboard", (req, res, next) => analyticsController.getDashboard(req, res, next));

export default router;