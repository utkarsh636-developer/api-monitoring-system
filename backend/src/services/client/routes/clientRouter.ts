import express, { Request, Response, NextFunction } from "express";
import clientDependencies from "../Dependencies/dependencies";
import authenticate from "../../../shared/middlewares/authenticate";
import { apiLimiter } from "../../../shared/middlewares/rateLimiter";

const router = express.Router();

const { clientController } = clientDependencies.controller;

router.use(authenticate);
router.use(apiLimiter);

// Client management routes
router.get("/admin/clients", (req: Request, res: Response, next: NextFunction) =>
    clientController.getClients(req, res, next)
);

router.post("/admin/clients", (req: Request, res: Response, next: NextFunction) =>
    clientController.createClient(req, res, next)
);

router.put("/admin/clients/:clientId", (req: Request, res: Response, next: NextFunction) =>
    clientController.updateClient(req, res, next)
);

router.delete("/admin/clients/:clientId", (req: Request, res: Response, next: NextFunction) =>
    clientController.deleteClient(req, res, next)
);

router.post("/admin/clients/onboard", (req: Request, res: Response, next: NextFunction) => 
    clientController.createClient(req, res, next)
);

router.post("/admin/clients/:clientId/users", (req: Request, res: Response, next: NextFunction) => 
    clientController.createClientUser(req, res, next)
);

router.post("/admin/clients/:clientId/api/keys", (req: Request, res: Response, next: NextFunction) => 
    clientController.createApiKey(req, res, next)
);

router.get("/admin/clients/:clientId/api/keys", (req: Request, res: Response, next: NextFunction) => 
    clientController.getClientApiKeys(req, res, next)
);

router.put("/admin/clients/:clientId/api/keys/:keyId", (req: Request, res: Response, next: NextFunction) => 
    clientController.updateApiKey(req, res, next)
);

router.delete("/admin/clients/:clientId/api/keys/:keyId", (req: Request, res: Response, next: NextFunction) => 
    clientController.deleteApiKey(req, res, next)
);

export default router;
