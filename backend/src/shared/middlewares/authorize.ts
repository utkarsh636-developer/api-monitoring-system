import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import ResponseFormatter from "../utils/responseFormatter";

const authorize = (allowedRoles: Role[] = []) => (
    req: Request, 
    res: Response, 
    next: NextFunction
): void | Response => {
    try {
        if (!req.user || !req.user.role) {
            return res.status(403).json(ResponseFormatter.error("Forbidden", 403));
        }

        // Added 'return' so that if no roles are required,
        // we call next() and stop executing this middleware. Otherwise, it would
        // continue running and throw a 403 Insufficient permissions error.
        if (allowedRoles.length === 0) {
            return next();
        }

        if (!allowedRoles.includes(req.user.role as Role)) {
            return res.status(403).json(ResponseFormatter.error("Insufficient permissions", 403));
        }

        next();
    } catch (error) {
        return res.status(403).json(ResponseFormatter.error("Forbidden", 403));
    }
};

export default authorize;
