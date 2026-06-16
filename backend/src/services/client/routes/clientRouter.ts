import express, { Request, Response, NextFunction } from "express";
import clientDependencies from "../Dependencies/dependencies";
import authenticate from "../../../shared/middlewares/authenticate";

const router = express.Router();

const { clientController } = clientDependencies.controller;

router.use(authenticate);

router.post("/admin/clients/onboard", (req: Request, res: Response, next: NextFunction) => 
    clientController.createClient(req, res, next)
);

router.post("/admin/clients/:clientId/users", (req: Request, res: Response, next: NextFunction) => 
    clientController.createClientUser(req, res, next)
);

router.post("/admin/clients/:clientId/api/keys", (req: Request, res: Response, next: NextFunction) => 
    clientController.createApiKey(req, res, next)
);

export default router;
