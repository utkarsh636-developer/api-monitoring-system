import { EventEmitter } from "node:events";
import { ChannelModel, ConfirmChannel } from "amqplib";

interface ConnectWaiter {
    resolve: (value: ConfirmChannel | PromiseLike<ConfirmChannel>) => void;
    reject: (reason?: any) => void;
}

export interface ConfirmChannelManagerOptions {
    rabbitmq: any;
    logger?: {
        info(message?: any, ...optionalParams: any[]): void;
        error(message?: any, ...optionalParams: any[]): void;
        warn(message?: any, ...optionalParams: any[]): void;
    };
}

export class ConfirmChannelManager extends EventEmitter {
    private rabbitmq: any;
    private logger: NonNullable<ConfirmChannelManagerOptions['logger']>;
    private channel: ConfirmChannel | null;
    private connecting: boolean;
    private connectWaiters: ConnectWaiter[];

    constructor({ rabbitmq, logger }: ConfirmChannelManagerOptions) {
        super();

        if (!rabbitmq) {
            throw new Error("Confirm Channel Manager requires rabbitmq connection manager");
        }

        this.rabbitmq = rabbitmq;
        this.logger = logger ?? console;
        this.channel = null;
        this.connecting = false;
        this.connectWaiters = [];
    }

    public async getChannel(): Promise<ConfirmChannel> {
        if (this.channel) return this.channel;

        if (this.connecting) {
            return new Promise<ConfirmChannel>((resolve, reject) => {
                this.connectWaiters.push({ resolve, reject });
            });
        }

        return this._connect();
    }

    private async _connect(): Promise<ConfirmChannel> {
        this.connecting = true;
        try {
            let connection: ChannelModel;

            const rawConnection = (this.rabbitmq as any).connection;

            if (rawConnection) {
                connection = rawConnection;
            } else {
                await this.rabbitmq.connect();

                const freshConnection = (this.rabbitmq as any).connection;
                if (!freshConnection) {
                    throw new Error('Failed to obtain RabbitMQ connection');
                }

                connection = freshConnection;
            }


            const confirmChannel = await connection.createConfirmChannel();

            confirmChannel.on('drain', () => this.emit('drain'));

            confirmChannel.on("close", () => {
                this.logger.warn('[ChannelManager] confirm channel closed unexpectedly');
                this.channel = null;
            });

            confirmChannel.on("error", (err: any) => {
                this.logger.error('[ChannelManager] confirm channel error', {
                    error: err.message,
                    stack: err.stack,
                    code: err.code,
                });
                this.channel = null;
                this.emit('error', err);
            });

            this.channel = confirmChannel;
            this.logger.info('[ChannelManager] confirm channel ready');

            for (const w of this.connectWaiters) w.resolve(confirmChannel);
            this.connectWaiters = [];

            return confirmChannel;

        } catch (error) {
            for (const w of this.connectWaiters) w.reject(error);
            this.connectWaiters = [];
            throw error;
        } finally {
            this.connecting = false;
        }
    }

    public async close(): Promise<void> {
        if (this.channel) {
            try {
                await this.channel.close();
            } catch (err: any) {
                this.logger.error('[ChannelManager] Error closing channel', err);
            }
            this.channel = null;
        }
    }
}
