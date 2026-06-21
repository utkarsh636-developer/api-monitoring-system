import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken";
import config from "../config/index";
import logger from "../config/logger";
import ResponseFormatter from "../utils/responseFormatter";
import CacheService from '../service/cacheService';

interface DecodedToken {
    userId: string;
    email: string;
    username: string;
    role: string;
    clientId?: string | null;
}

// Extend Express Request type so TypeScript recognizes 'req.user'
declare global {
    namespace Express {
        interface Request {
            user?: DecodedToken;
        }
    }
}

const authenticate = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void | Response> => {
    try {
        let token: string | null = null;

        if (req.cookies && req.cookies.authToken) {
            token = req.cookies.authToken;
        }

        if (!token) {
            return res.status(401).json(
                ResponseFormatter.error("Authentication token is required", 401)
            );
        }

        // Check if token is blacklisted (logged out)
        const isBlacklisted = await CacheService.get<boolean>(`jwt:blacklist:${token}`);
        if (isBlacklisted) {
            logger.warn("Attempted access with blacklisted/logged-out token", {
                path: req.path,
                ip: req.ip,
            });
            return res.status(401).json(
                ResponseFormatter.error("Token is invalid or logged out", 401)
            );
        }

        const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;

        const { userId, email, username, role, clientId } = decoded;

        req.user = {
            userId,
            email,
            username,
            role,
            clientId
        };

        next();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : "";

        logger.error("Authentication failed", {
            error: errorMessage,
            path: req.path
        });

        if (errorName === 'TokenExpiredError') {
            return res
                .status(401)
                .json(ResponseFormatter.error('Token expired', 401));
        }

        return res
            .status(401)
            .json(ResponseFormatter.error('Invalid token', 401));
    }
};

export default authenticate;
