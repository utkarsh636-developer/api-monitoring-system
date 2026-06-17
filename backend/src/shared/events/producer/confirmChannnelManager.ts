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
    private _rabbitmq: any;
    private _logger: NonNullable<ConfirmChannelManagerOptions['logger']>;
    private _channel: ConfirmChannel | null;
    private _connecting: boolean;
    private _connectWaiters: ConnectWaiter[];

    constructor({ rabbitmq, logger }: ConfirmChannelManagerOptions) {
        super();

        if (!rabbitmq) {
            throw new Error("Confirm Channel Manager requires rabbitmq connection manager");
        }

        this._rabbitmq = rabbitmq;
        this._logger = logger ?? console;
        this._channel = null;
        this._connecting = false;
        this._connectWaiters = [];
    }

    public async getChannel(): Promise<ConfirmChannel> {
        if (this._channel) return this._channel;

        if (this._connecting) {
            return new Promise<ConfirmChannel>((resolve, reject) => {
                this._connectWaiters.push({ resolve, reject });
            });
        }

        return this._connect();
    }

    private async _connect(): Promise<ConfirmChannel> {
        this._connecting = true;
        try {
            let connection: ChannelModel;

            const rawConnection = (this._rabbitmq as any).connection;

            if (rawConnection) {
                connection = rawConnection;
            } else {
                await this._rabbitmq.connect();

                const freshConnection = (this._rabbitmq as any).connection;
                if (!freshConnection) {
                    throw new Error('Failed to obtain RabbitMQ connection');
                }

                connection = freshConnection;
            }


            const confirmChannel = await connection.createConfirmChannel();

            confirmChannel.on('drain', () => this.emit('drain'));

            confirmChannel.on("close", () => {
                this._logger.warn('[ChannelManager] confirm channel closed unexpectedly');
                this._channel = null;
            });

            confirmChannel.on("error", (err: any) => {
                this._logger.error('[ChannelManager] confirm channel error', {
                    error: err.message,
                    stack: err.stack,
                    code: err.code,
                });
                this._channel = null;
                this.emit('error', err);
            });

            this._channel = confirmChannel;
            this._logger.info('[ChannelManager] confirm channel ready');

            for (const w of this._connectWaiters) w.resolve(confirmChannel);
            this._connectWaiters = [];

            return confirmChannel;

        } catch (error) {
            for (const w of this._connectWaiters) w.reject(error);
            this._connectWaiters = [];
            throw error;
        } finally {
            this._connecting = false;
        }
    }
}
