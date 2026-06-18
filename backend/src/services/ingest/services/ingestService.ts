import logger from '../../../shared/config/logger';
import AppError from '../../../shared/utils/AppError';
import crypto from 'crypto';
import { EventProducer } from '../../../shared/events/producer/eventProducer';

export interface ApiHitInput {
    serviceName: string;
    endpoint: string;
    method: string;
    statusCode: string | number;
    latencyMs: string | number;
    clientId: string;
    apiKeyId?: string;
    ip?: string;
    userAgent?: string;
}

export interface IngestServiceDependencies {
    eventProducer: EventProducer;
}

export class IngestService {
    private eventProducer: EventProducer;

    constructor({ eventProducer }: IngestServiceDependencies) {
        if (!eventProducer) throw new Error('IngestService requires eventProducer');
        this.eventProducer = eventProducer;
    }

    async ingestApiHit(hitData: ApiHitInput) {
        try {
            this.validateHitData(hitData);

            const event = {
                eventId: crypto.randomUUID(),
                timestamp: new Date(),
                serviceName: hitData.serviceName,
                endpoint: hitData.endpoint,
                method: hitData.method.toUpperCase(),
                statusCode: typeof hitData.statusCode === 'number' ? hitData.statusCode : parseInt(String(hitData.statusCode), 10),
                latencyMs: typeof hitData.latencyMs === 'number' ? hitData.latencyMs : parseFloat(String(hitData.latencyMs)),
                clientId: hitData.clientId,
                apiKeyId: hitData.apiKeyId,
                ip: hitData.ip || 'unknown',
                userAgent: hitData.userAgent || '',
            };

            const published = await this.eventProducer.publishApiHit(event);

            if (!published) {
                logger.warn('API hit rejected by circuit breaker', {
                    eventId: event.eventId,
                    endpoint: event.endpoint,
                    method: event.method,
                    clientId: event.clientId,
                });

                return {
                    eventId: event.eventId,
                    status: 'rejected',
                    reason: 'service_unavailable',
                    timestamp: event.timestamp,
                };
            }

            logger.info('API hit ingested', {
                eventId: event.eventId,
                endpoint: event.endpoint,
                method: event.method,
                clientId: event.clientId,
            });

            return {
                eventId: event.eventId,
                status: 'queued',
                timestamp: event.timestamp,
            };
        } catch (error) {
            logger.error('Error ingesting API hit:', error);
            throw error;
        }
    }

    validateHitData(hitData: ApiHitInput): void {
        const requiredFields: (keyof ApiHitInput)[] = [
            'serviceName',
            'endpoint',
            'method',
            'statusCode',
            'latencyMs',
            'clientId',
        ];

        const missingFields = requiredFields.filter((field) => !hitData[field]);

        if (missingFields.length > 0) {
            throw new AppError(`Missing required fields: ${missingFields.join(",")}`, 400);
        }

        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

        if (!validMethods.includes(hitData.method.toUpperCase())) {
            throw new AppError(`Invalid HTTP methods: ${hitData.method} `, 400);
        }

        const statusCode = typeof hitData.statusCode === 'number' ? hitData.statusCode : parseInt(String(hitData.statusCode), 10);
        if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
            throw new AppError(`Invalid Status code : ${hitData.statusCode} `, 400);
        }

        const latency = typeof hitData.latencyMs === 'number' ? hitData.latencyMs : parseFloat(String(hitData.latencyMs));
        if (isNaN(latency) || latency < 0) {
            throw new AppError(`Invalid latency : ${hitData.latencyMs} `, 400);
        }
    }
}
