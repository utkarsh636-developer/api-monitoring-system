import { Request, Response, NextFunction } from 'express';
import { Client, ApiKey } from '@prisma/client';
import ResponseFormatter from '../utils/responseFormatter';
import logger from '../config/logger';
import clientContainer from '../../services/client/Dependencies/dependencies';

declare global {
    namespace Express {
        interface Request {
            client?: Client;
            apiKey?: ApiKey;
        }
    }
}

const validateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey || typeof apiKey !== 'string') {
            logger.warn('API request without API key or invalid format', {
                path: req.path,
                ip: req.ip,
            });
            return res
                .status(401)
                .json(ResponseFormatter.error('API key is required', 401));
        }

        
        const result = await clientContainer.services.clientServices.getClientByApiKey(apiKey);

        if (!result) {
            logger.warn('Invalid API key attempted', {
                path: req.path,
                ip: req.ip,
                apiKey: apiKey.substring(0, 8) + '...',
            });
            return res
                .status(403)
                .json(ResponseFormatter.error('Invalid API key', 403));
        }

        const { client, apiKey: apiKeyObj } = result;

        
        if (!client.isActive) {
            logger.warn('Inactive client attempted API access', {
                path: req.path,
                ip: req.ip,
                clientId: client.id, 
            });
            return res
                .status(403)
                .json(ResponseFormatter.error('Client account is inactive', 403));
        }

        if (!apiKeyObj.canIngest) {
            logger.warn('API key without ingest permission attempted access', {
                path: req.path,
                ip: req.ip,
                apiKeyId: apiKeyObj.id, 
            });
            return res
                .status(403)
                .json(ResponseFormatter.error('API key does not have ingest permissions', 403));
        }

        req.client = client;
        req.apiKey = apiKeyObj;

        logger.debug('API key validated successfully', {
            clientId: client.id,
            clientName: client.name,
            apiKeyId: apiKeyObj.id,
        });

        next();
    } catch (error) {
        logger.error('Error validating API key:', error);
        return res
            .status(500)
            .json(ResponseFormatter.error('Internal server error', 500));
    }
};

export default validateApiKey;
