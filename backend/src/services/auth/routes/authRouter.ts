import express, { Request, Response, NextFunction } from "express";
import dependencies from "../Dependencies/dependencies";
import authorize from "../../../shared/middlewares/authorize";
import authenticate from "../../../shared/middlewares/authenticate";
import validate from "../../../shared/middlewares/validate";
import requestLogger from "../../../shared/middlewares/requestLogger";
import { onboardSuperAdminSchema, loginSchema, registrationSchema } from "../validation/authSchema";
import { APPLICATION_ROLES } from "../../../shared/constants/roles";

const router = express.Router();
const { controller } = dependencies;
const authController = controller.authController;

router.post("/onboard-super-admin",
    requestLogger,
    validate(onboardSuperAdminSchema),
    (req: Request, res: Response, next: NextFunction) => authController.onboardSuperAdmin(req, res, next)
);

export default router;
