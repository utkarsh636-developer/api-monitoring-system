import { EVENT_TYPES } from "../eventContract";
import { isRetryable } from "./retryStrategy";
import { ConfirmChannelManager } from "./confirmChannnelManager";
import { CircuitBreaker } from "./circuitBreaker";
import { RetryStrategy } from "./retryStrategy";
import { Options } from "amqplib";

export interface EventProducerOptions {
    channelManager: ConfirmChannelManager;
    circuitBreaker: CircuitBreaker;
    retryStrategy: RetryStrategy;
    logger?: {
        info(message?: any, ...optionalParams: any[]): void;
        error(message?: any, ...optionalParams: any[]): void;
        warn(message?: any, ...optionalParams: any[]): void;
        debug(message?: any, ...optionalParams: any[]): void;
    };
    queueName: string;
}

export interface EventProducerMetrics {
    published: number;
    failed: number;
    retriesExhausted: number;
}

export class EventProducer {
    private channelManager: ConfirmChannelManager;
    private circuitBreaker: CircuitBreaker;
    private retry: RetryStrategy;
    private logger: any;
    private queueName: string;
    private metrics: EventProducerMetrics;
    private shuttingDown: boolean;

    constructor({ channelManager, circuitBreaker, retryStrategy, logger, queueName }: EventProducerOptions) {
        if (!channelManager) throw new Error('EventProducer requires channelManager');
        if (!circuitBreaker) throw new Error('EventProducer requires circuitBreaker');
        if (!retryStrategy) throw new Error('EventProducer requires retryStrategy');
        if (!queueName) throw new Error('EventProducer requires queueName');

        this.channelManager = channelManager;
        this.circuitBreaker = circuitBreaker;
        this.retry = retryStrategy;
        this.logger = logger ?? console;
        this.queueName = queueName;

        this.metrics = {
            published: 0,
            failed: 0,
            retriesExhausted: 0
        };

        this.shuttingDown = false;
    }

    private incrementMetric(metric: keyof EventProducerMetrics): void {
        this.metrics[metric] = (this.metrics[metric] || 0) + 1;
    }

    private async publish(
        eventData: { eventId: string; [key: string]: any },
        meta: { correlationId: string; attempt: number }
    ): Promise<void> {
        const { correlationId, attempt } = meta;
        const channel = await this.channelManager.getChannel();

        const message = {
            type: EVENT_TYPES.API_HIT,
            data: eventData,
            publishedAt: new Date().toISOString(),
            attempt: attempt + 1
        };

        const buffer = Buffer.from(JSON.stringify(message));

        const publishOptions: Options.Publish = {
            persistent: true,
            contentType: 'application/json',
            messageId: eventData.eventId,
            correlationId,
            timestamp: Math.floor(Date.now() / 1000)
        };

        return new Promise<void>((resolve, reject) => {
            const written = channel.publish(
                '',
                this.queueName,
                buffer,
                publishOptions,
                (err) => {
                    if (err) return reject(new Error(`Publish nacked: ${err.message}`));
                    resolve();
                }
            );

            if (!written) {
                this.logger.info('[EventProducer] back-pressure detected, waiting for drain', {
                    eventId: eventData.eventId,
                });
            }

            const onDrain = () => {
                channel.removeListener('drain', onDrain);
                this.logger.debug('[EventProducer] drain event received', {
                    eventId: eventData.eventId,
                });
            };

            channel.once("drain", onDrain);
        });
    }

}
