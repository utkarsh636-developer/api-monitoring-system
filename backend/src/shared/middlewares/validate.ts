import { Request, Response, NextFunction } from 'express';
import ResponseFormatter from "../utils/responseFormatter";

export interface ValidationRule {
    required: boolean;
    minLength?: number;
    custom?: (value: any, body: any) => string | null;
}

const validate = (schema?: Record<string, ValidationRule>) => (
    req: Request, 
    res: Response, 
    next: NextFunction
): void | Response => {
    if (!schema) {
        return next();
    }

    const errors: string[] = [];
    const body = req.body || {};

    Object.entries(schema).forEach(([field, rules]) => {
        const value = body[field];

        if (rules.required && (value === undefined || value === null || value === "")) {
            errors.push(`${field} is required`);
            return;
        }

        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
        }

        if (rules.custom && typeof rules.custom === 'function') {
            const customErr = rules.custom(value, body);
            if (customErr) {
                errors.push(customErr);
            }
        }
    });

    if (errors.length > 0) {
        return res.status(400).json(ResponseFormatter.error("Validation failed", 400, errors));
    }

    next();
};

export default validate;
