import { Request, Response, NextFunction } from 'express';
import { logger } from "../lib/logger"
import { ResponseFormatter } from "../utils/responseFormatter"
import { Prisma } from "@prisma/client"

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    let errors = err.errors || null


    logger.error('Error occurred:', {
        message: err.message,
        statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            statusCode = 409;
            message = 'Duplicate key error: A record with this unique value already exists.';
            errors = err.meta?.target || null;
        }
    }
    else if(err.name === "ValidationError"){
        statusCode = 400;
        message = "Validation Error";
        errors = Object.values(err.errors).map((e: any) => e.message)
    }
    else if(err.name === 'JsonWebTokenError'){
        statusCode = 401;
        message = 'Invalid token';
    } 
    else if(err.name === 'TokenExpiredError'){
        statusCode = 401;
        message = 'Token expired';
    };

    res.status(statusCode).json(ResponseFormatter.error(message, statusCode, errors))
}

export default errorHandler;