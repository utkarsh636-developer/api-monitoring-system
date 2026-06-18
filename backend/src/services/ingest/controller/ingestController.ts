import { Request, Response, NextFunction } from 'express';
import logger from '../../../shared/config/logger';
import ResponseFormatter from '../../../shared/utils/responseFormatter';
import { IngestService } from '../services/ingestService';

export interface IngestControllerDependencies {
    ingestService: IngestService;
}

export class IngestController {
    private ingestService: IngestService;

    constructor({ ingestService }: IngestControllerDependencies) {
        if (!ingestService) throw new Error("IngestController requires ingest service");
        this.ingestService = ingestService;
    }

    async ingestHit(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            logger.info('Ingest: Client data received', {
                clientId: req.client?.id,
                clientName: req.client?.name,
                clientKeys: req.client ? Object.keys(req.client) : []
            });

            const hitData = {
                ...req.body,
                clientId: req.client?.id || '',
                apiKeyId: req.apiKey?.id,
                ip: req.ip || req.socket?.remoteAddress || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || ''
            };

            logger.info('Ingest: Hit data prepared', {
                clientId: req.client?.id,
                endpoint: hitData.endpoint,
                method: hitData.method
            });

            const result = await this.ingestService.ingestApiHit(hitData);

            if (result.status === 'rejected') {
                return res.status(503).json(ResponseFormatter.error(
                    'Service temporarily unavailable',
                    503,
                    {
                        eventId: result.eventId,
                        reason: result.reason,
                        retryAfter: '30 seconds'
                    }
                ));
            }

            return res.status(202).json(ResponseFormatter.success(result, 'API hit queued for processing', 202));
        } catch (error) {
            next(error);
        }
    }
}
