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

            // // Temporary direct Postgres write for benchmarking:
            // const prisma = require('../../../shared/config/prisma').default.getClient();
            // const crypto = require('crypto');

            // if (!prisma) throw new Error("DB Client not initialized");

            // await prisma.apiHit.create({
            //     data: {
            //         eventId: hitData.eventId || crypto.randomUUID(),
            //         timestamp: new Date(),
            //         serviceName: hitData.serviceName,
            //         endpoint: hitData.endpoint,
            //         method: hitData.method.toUpperCase() as any,
            //         statusCode: Number(hitData.statusCode),
            //         latencyMs: Number(hitData.latencyMs),
            //         clientId: hitData.clientId,
            //         apiKeyId: hitData.apiKeyId,
            //         ip: hitData.ip || 'unknown',
            //         userAgent: hitData.userAgent || '',
            //     }
            // });

            // return res.status(200).json(ResponseFormatter.success({ eventId: hitData.eventId }, 'API hit saved', 200));


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

            // This gives performance boost but isnt user friendly
            // // Start publishing in the background (fire-and-forget)
            // this.ingestService.ingestApiHit(hitData).catch(err => {
            //     logger.error('Background ingestion publish failed:', err);
            // });

            // // Return 202 Accepted immediately
            // return res.status(202).json(ResponseFormatter.success({ status: 'queued' }, 'API hit queued for processing', 202));
        } catch (error) {
            next(error);
        }
    }
}
