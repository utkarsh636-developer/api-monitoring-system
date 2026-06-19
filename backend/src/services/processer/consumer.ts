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
}
