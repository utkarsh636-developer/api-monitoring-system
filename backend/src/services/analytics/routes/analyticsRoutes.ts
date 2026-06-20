import express, { Router } from 'express';
import analyticsContainer from '../Dependencies/dependencies';
import authenticate from '../../../shared/middlewares/authenticate';

const router: Router = express.Router();
const { analyticsController } = analyticsContainer.controllers;

router.get("/stats", authenticate, (req, res, next) => analyticsController.getStats(req, res, next));

router.get("/dashboard", authenticate, (req, res, next) => analyticsController.getDashboard(req, res, next));

export default router;