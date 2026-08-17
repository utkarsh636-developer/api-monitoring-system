import express, { Request, Response, NextFunction } from 'express';
import genaiDependencies from '../Dependencies/dependencies';
import authenticate from '../../../shared/middlewares/authenticate';
import { apiLimiter } from '../../../shared/middlewares/rateLimiter';

const router = express.Router();
const { genaiController } = genaiDependencies.controller;

router.use(authenticate);
router.use(apiLimiter);

// Natural-language metrics query — requires authenticated user with a clientId
router.post('/query', (req: Request, res: Response, next: NextFunction) =>
    genaiController.queryNl(req, res, next)
);

export default router;
