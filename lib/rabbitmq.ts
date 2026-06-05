import amqp, { Connection, Channel, ChannelModel } from "amqplib"
import { config } from "../config"
import { logger } from "./logger"


class RabbitMQConnection {
    private connection: ChannelModel | null;
    private channel: Channel | null;
    private isConnecting: boolean;

    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnecting = false;
    }

    async connect(): Promise<Channel | null> {
        if (this.channel) {
            return this.channel;
        }

        // If already connecting, wait (poll) until finished to reuse the channel
        // This prevents duplicate connection leaks during concurrent page loads at startup
        if (this.isConnecting) {
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100)
            })
            return this.channel;
        }

        try {
            this.isConnecting = true;

            logger.info("Connecting to RabbitMQ", config.rabbitmq.url);

            // Create local instance first to guarantee type-safety
            const conn = await amqp.connect(config.rabbitmq.url);
            const chan = await conn.createChannel();

            this.connection = conn;
            this.channel = chan;

            // Creating Key | Queue Name
            const dlqName = `${config.rabbitmq.queue}.dlq` //api_hits.dlq

            // DL Queue
            await chan.assertQueue(dlqName, {
                durable: true
            })

            // Normal Queue
            await chan.assertQueue(config.rabbitmq.queue, {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "",
                    "x-dead-letter-routing-key": dlqName
                }
            })

            logger.info("RabbitMQ connected, queue", config.rabbitmq.queue)

            conn.on('close', () => {
                logger.warn('RabbitMQ connection closed');
                this.connection = null;
                this.channel = null;
            })

            this.connection = conn;
            this.channel = chan;

            this.isConnecting = false;
            return this.channel;
        } catch (error: any) {
            this.isConnecting = false;
            logger.error("Failed to connect to RabbitMQ", error);
            throw error;
        }
    }

    getChannel(): Channel | null {
        return this.channel;
    }

    getStatus(): "connected" | "disconnected" {
        if (!this.connection || !this.channel) return "disconnected";
        return "connected";
    }

    async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }

            logger.info("RabbitMQ connection closed");
        } catch (error: any) {
            logger.error("Error in closing RabbitMQ connection", error);
        }
    }
}

// == DEVELOPMENT SINGLETON (PREVENTS LEAKS DURING NEXT.JS HMR) ==
declare global {
    var rabbitmqGlobalConnection: RabbitMQConnection | undefined;
}

// Check if we already created a connection manager on globalThis
const rabbitmqConnection = globalThis.rabbitmqGlobalConnection ?? new RabbitMQConnection();

export default rabbitmqConnection;

// Cache the connection manager on globalThis only in development mode
if (process.env.NODE_ENV !== 'production') {
    globalThis.rabbitmqGlobalConnection = rabbitmqConnection;
}

// == PRODUCTION ONLY (COMMENTED OUT FOR FUTURE USE) ==
// export default new RabbitMQConnection();

