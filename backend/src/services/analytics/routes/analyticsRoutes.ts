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

// Snapshot endpoint: returns the last 300 EndpointMetrics records in chronological order.
// Used by the WebSocket Snapshot + Delta pattern to resync in-memory state with PostgreSQL
// on initial page load and on every WebSocket reconnect (including after force-close 4000).
router.get("/snapshot", (req, res, next) => analyticsController.getSnapshot(req, res, next));

export default router;