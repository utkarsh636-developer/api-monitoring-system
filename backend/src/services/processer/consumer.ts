import { z } from 'zod';
import { EVENT_TYPES } from '../../shared/events/eventContract';
import { RetryStrategy, isRetryable } from '../../shared/events/producer/retryStrategy';
import { CircuitBreaker } from '../../shared/events/producer/circuitBreaker';
import { ProcessorService } from './service/processorService';

const messageSchema = z.object({
    type: z.enum([EVENT_TYPES.API_HIT]),
    data: z.record(z.string(), z.unknown()),
    messageId: z.string().optional(),
    timestamp: z.union([z.string(), z.number()]).optional(),
});

export interface EventConsumerDependencies {
    processorService: ProcessorService;
    rabbitmq: any;
    postgres: any;
    config: any;
    logger: any;
    retryStrategy: RetryStrategy;
    circuitBreaker: CircuitBreaker;
}

export interface ParsedMessage {
    type: string;
    data: Record<string, any>;
    messageId: string;
    timestamp?: string | number;
    retryCount: number;
}

export class EventConsumer {
    private processorService: ProcessorService;
    private rabbitmq: any;
    private postgres: any;
    private config: any;
    private logger: any;
    private retryStrategy: RetryStrategy;
    private circuitBreaker: CircuitBreaker;

    public isRunning: boolean;
    public channel: any;
    
    private stats: {
        processed: number;
        failed: number;
        retried: number;
        dlqRouted: number;
        lastProcessedAt: Date | null;
    };
    private processedIds: Set<string>;
    private poisonMessages: Map<string, number>;

    constructor({
        processorService,
        rabbitmq,
        postgres,
        config,
        logger,
        retryStrategy,
        circuitBreaker,
    }: EventConsumerDependencies) {
        this.processorService = processorService;
        this.rabbitmq = rabbitmq;
        this.postgres = postgres;
        this.config = config;
        this.logger = logger;
        this.retryStrategy = retryStrategy;
        this.circuitBreaker = circuitBreaker;

        this.isRunning = false;
        this.channel = null;
        this.stats = { processed: 0, failed: 0, retried: 0, dlqRouted: 0, lastProcessedAt: null };
        this.processedIds = new Set();
        this.poisonMessages = new Map();
    }

    async start(): Promise<void> {
        try {
            await this.connectDatabases();
            this.channel = await this.rabbitmq.connect();
            const prefetch = this.config.consumer?.prefetch || 10;
            this.channel.prefetch(prefetch);

            this.channel.on('error', (err: any) => {
                this.logger.error('Consumer channel error:', err);
                this.circuitBreaker.onFailure();
            });

            this.channel.on('close', () => {
                this.logger.warn('Consumer channel closed unexpectedly');
                if (this.isRunning) this.reconnect();
            });

            this.logger.info(`Started consuming from queue: ${this.config.rabbitmq.queue}`);
            this.isRunning = true;

            await this.channel.consume(
                this.config.rabbitmq.queue,
                async (msg: any) => {
                    if (msg !== null) await this.handleMessage(msg);
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` }
            );

            this.logger.info('Event consumer is running');
        } catch (error) {
            this.logger.error('Failed to start consumer:', error);
            await this.cleanup();
            throw error;
        }
    }

    private async cleanup(): Promise<void> {
        try {
            this.isRunning = false;
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
        } catch (error) {
            this.logger.error('Error during cleanup:', error);
        }
    }

    private async connectDatabases(): Promise<void> {
        const maxRetries = 5;
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                this.logger.info('Connecting to database...');
                
                await this.postgres.testConnection();
                
                this.logger.info('Database connection established');
                return;
            } catch (error: any) {
                retries++;
                this.logger.error(`Database connection attempt ${retries} failed:`, error);
                if (retries >= maxRetries) {
                    throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
                }
                await new Promise(resolve => setTimeout(resolve, 5000 * retries));
            }
        }
    }

    private async reconnect(): Promise<void> {
        try {
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.channel = await this.rabbitmq.connect();
            const prefetch = this.config.consumer?.prefetch || 10;
            this.channel.prefetch(prefetch);
    
            this.channel.on('error', (err: any) => {
                this.logger.error('Consumer channel error:', err);
                this.circuitBreaker.onFailure();
            });
    
            this.channel.on('close', () => {
                this.logger.warn('Consumer channel closed unexpectedly');
                if (this.isRunning) this.reconnect();
            });
    
            await this.channel.consume(
                this.config.rabbitmq.queue,
                async (msg: any) => {
                    if (msg !== null) await this.handleMessage(msg);
                },
                { noAck: false, consumerTag: `consumer-${Date.now()}` }
            );
        } catch (error) {
            this.logger.error('Failed to reconnect:', error);
            if (this.isRunning) {
                setTimeout(() => this.reconnect(), 10000);
            }
        }
    }

    async handleMessage(msg: any): Promise<void> {
        if (!this.circuitBreaker.allowRequest()) {
            this.logger.warn('Circuit breaker open, requeuing message');
            this.channel.nack(msg, false, true);
            return;
        }
        const startTime = Date.now();
        let messageData: ParsedMessage | null = null;
        try {
            messageData = this.parseMessage(msg);
            // Idempotency (Duplicate Prevention)
            if (this.processedIds.has(messageData.messageId)) {
                this.logger.debug('Duplicate message skipped', { messageId: messageData.messageId });
                this.channel.ack(msg);
                return;
            }
            await this.processMessage(messageData);
            this.channel.ack(msg);
            this.circuitBreaker.onSuccess();
            this.stats.processed++;
            this.stats.lastProcessedAt = new Date();
            this.processedIds.add(messageData.messageId);
            if (this.processedIds.size > 100_000) {
                const first = this.processedIds.values().next().value;
                if (first !== undefined) {
                    this.processedIds.delete(first);
                }
            }
            this.poisonMessages.delete(messageData.type);
        } catch (error) {
            await this.handleProcessingError(error, msg, messageData, startTime);
        }
    }

    private parseMessage(msg: any): ParsedMessage {
        try {
            const content = msg.content.toString();
            const messageData = JSON.parse(content);
            const parsed = messageSchema.safeParse(messageData);
            if (!parsed.success) {
                throw new Error(`Schema validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}`);
            }
            return {
                type: parsed.data.type,
                data: parsed.data.data,
                messageId: msg.properties.messageId || parsed.data.messageId || messageData.messageId || "unknown",
                timestamp: parsed.data.timestamp,
                retryCount: parseInt(msg.properties.headers?.['x-retry-count'] || 0, 10)
            };
        } catch (error: any) {
            throw new Error(`Message parsing failed: ${error.message}`);
        }
    }

    private async processMessage(messageData: ParsedMessage): Promise<void> {
        switch (messageData.type) {
            case EVENT_TYPES.API_HIT:
                await this.processorService.processEvent(messageData.data as any);
                break;
            default:
                throw new Error(`Unknown event type: ${messageData.type}`);
        }
    }

    private async handleProcessingError(
        error: any,
        msg: any,
        messageData: ParsedMessage | null,
        startTime: number
    ): Promise<void> {
        const messageId = messageData?.messageId || msg.properties?.messageId || 'unknown';
        const retryCount = messageData?.retryCount || 0;
        this.circuitBreaker.onFailure();
        this.stats.failed++;

        const eventType = messageData?.type || 'unknown';
        const poisonCount = (this.poisonMessages.get(eventType) || 0) + 1;
        this.poisonMessages.set(eventType, poisonCount);
        if (poisonCount >= 10) {
            this.logger.error('Poison message pattern detected', { eventType, consecutiveFailures: poisonCount });
        }

        const isMaxRetriesExceeded = !this.retryStrategy.shouldRetry(retryCount);

        // Non-retryable errors or max retries exceeded go straight to Dead-Letter Queue (DLQ)
        if (!isRetryable(error) || isMaxRetriesExceeded) {
            await this.sendToDLQ(
                msg,
                error,
                isMaxRetriesExceeded ? 'MAX_RETRIES_EXCEEDED' : 'NON_RETRYABLE'
            );
            return;
        }

        await this.retryMessage(msg, retryCount);
    }

    private async sendToDLQ(msg: any, error: any, reason: string): Promise<void> {
        try {
            const dlqName = `${this.config.rabbitmq.queue}.dlq`;
            this.channel.sendToQueue(dlqName, msg.content, {
                ...msg.properties,
                persistent: true,
                headers: {
                    ...msg.properties.headers,
                    'x-dlq-reason': reason,
                    'x-dlq-error': error.message,
                    'x-dlq-timestamp': Date.now(),
                    'x-original-queue': this.config.rabbitmq.queue,
                },
            });

            this.channel.ack(msg);
            this.stats.dlqRouted++;
        } catch (err) {
            this.logger.error('Failed to send message to DLQ:', err);
            this.channel.nack(msg, false, false);
        }
    }

    private async retryMessage(msg: any, retryCount: number): Promise<void> {
        const delay = this.retryStrategy.delay(retryCount);

        const retryHeaders = {
            ...msg.properties.headers,
            'x-retry-count': retryCount + 1,
            'x-retry-timestamp': Date.now(),
            'x-retry-delay': delay,
            'x-original-queue': this.config.rabbitmq.queue,
        };

        setTimeout(() => {
            try {
                this.channel.sendToQueue(this.config.rabbitmq.queue, msg.content, { ...msg.properties, headers: retryHeaders });
                this.logger.info('Message scheduled for retry', {
                    messageId: msg.properties.messageId,
                    retryCount: retryCount + 1,
                    delay,
                });
            } catch (error) {
                this.logger.error('Failed to schedule retry:', error);
                this.sendToDLQ(msg, error, 'RETRY_FAILED');
            }
        }, delay);

        this.channel.ack(msg);
        this.stats.retried++;
    }

    async stop(): Promise<void> {
        try {
            await this.cleanup();

            await Promise.all([
                this.rabbitmq.close(),
                this.postgres.close()
            ]);
        } catch (error) {
            this.logger.error('Error stopping consumer:', error);
        }
    }

}
