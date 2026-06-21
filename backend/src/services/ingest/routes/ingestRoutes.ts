import express, { Router } from "express";
import ingestContainer from '../Dependencies/dependencies';
import validateApiKey from '../../../shared/middlewares/validateApiKey';
import { ingestLimiter } from '../../../shared/middlewares/rateLimiter';

const router: Router = express.Router();
const { ingestController } = ingestContainer.controllers;

router.post("/", validateApiKey, ingestLimiter, (req, res, next) => {
    ingestController.ingestHit(req, res, next);
});

export default router;
