import { IncomingMessage, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import config from '../config/index';
import logger from '../config/logger';
import CacheService from '../service/cacheService';
import { LIVE_METRICS_CHANNEL, LiveMetricEvent } from './liveMetricsPublisher';

// How many bytes can be buffered on a client socket before
// we consider it "too slow" and drop the message instead of queuing.
const BACKPRESSURE_THRESHOLD_BYTES = 1024 * 16; // 16 KB

interface DecodedToken {
    userId: string;
    email: string;
    username: string;
    role: string;
    clientId?: string | null;
}

export interface DashboardWsServerDependencies {
    httpServer: Server;
}

export class DashboardWsServer {
    private wss: WebSocketServer;
    private subscriber: Redis;
    private clients: Set<WebSocket>;
    private isSubscribed: boolean;

    constructor({ httpServer }: DashboardWsServerDependencies) {
        if (!httpServer) {
            throw new Error('DashboardWsServer requires an httpServer instance');
        }

        this.clients = new Set();
        this.isSubscribed = false;

        // Attach to the HTTP server via manual upgrade handling (noServer: true)
        // to prevent double HTTP upgrade handshakes.
        this.wss = new WebSocketServer({ noServer: true }); // noServer: true as this allows us to intercept incoming upgrade requests, authenticate the user's JWT, and only accept WebSocket requests sent to the path /dashboard-ws.

        // A dedicated Redis connection purely for SUBSCRIBE.
        // Redis Pub/Sub puts a connection into "subscriber mode" which
        // disallows all other commands (GET, SET, etc.) on that same connection.
        this.subscriber = new Redis(config.redis.url, {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });

        this._attachSubscriberEvents();
        this._attachWssEvents();
    }

    private _attachSubscriberEvents(): void {
        this.subscriber.on('connect', () => {
            logger.info('[DashboardWS] Redis subscriber connected');
        });

        this.subscriber.on('ready', () => {
            this._subscribe();
        });

        this.subscriber.on('error', (error: Error) => {
            logger.error('[DashboardWS] Redis subscriber error', {
                error: error.message,
            });
        });

        this.subscriber.on('close', () => {
            logger.warn('[DashboardWS] Redis subscriber connection closed');
            this.isSubscribed = false;
        });

        // ioredis reconnects automatically; when it recovers re-subscribe.
        this.subscriber.on('reconnecting', () => {
            logger.info('[DashboardWS] Redis subscriber reconnecting...');
        });

        // Fired when a message arrives on any subscribed channel.
        this.subscriber.on('message', (channel: string, message: string) => {
            if (channel !== LIVE_METRICS_CHANNEL) return;
            this._broadcastToClients(message);
        });
    }

    private _subscribe(): void {
        if (this.isSubscribed) return;

        this.subscriber.subscribe(LIVE_METRICS_CHANNEL).then(() => {
            this.isSubscribed = true;
            logger.info(`[DashboardWS] Subscribed to channel: ${LIVE_METRICS_CHANNEL}`);
        }).catch((error: unknown) => {
            logger.error('[DashboardWS] Failed to subscribe to Redis channel', {
                error: error instanceof Error ? error.message : String(error),
                channel: LIVE_METRICS_CHANNEL,
            });
        });
    }

    private _attachWssEvents(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            logger.info('[DashboardWS] Client connected', {
                totalClients: this.clients.size + 1,
            });

            this.clients.add(ws);

            ws.on('close', () => {
                this.clients.delete(ws);
                logger.info('[DashboardWS] Client disconnected', {
                    totalClients: this.clients.size,
                });
            });

            ws.on('error', (error: Error) => {
                logger.error('[DashboardWS] WebSocket client error', {
                    error: error.message,
                });
                this.clients.delete(ws);
            });
        });

        this.wss.on('error', (error: Error) => {
            logger.error('[DashboardWS] WebSocket server error', {
                error: error.message,
            });
        });
    }

    /**
     * Called by the HTTP server's 'upgrade' event before the WebSocket
     * handshake is completed. Validates the JWT and rejects unauthenticated
     * upgrade requests with a raw HTTP 401 response.
     */
    async verifyUpgrade(request: IncomingMessage, socket: any, head: Buffer): Promise<void> {
        const pathname = request.url ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname : '';
        if (pathname !== '/dashboard-ws') {
            return;
        }

        try {
            const token = this._extractToken(request);

            if (!token) {
                if (config.node_env !== 'production') {
                    logger.info('[DashboardWS] Development mode: allowing WebSocket upgrade without token');
                    this.wss.handleUpgrade(request, socket, head, (ws) => {
                        this.wss.emit('connection', ws, request);
                    });
                    return;
                }
                this._rejectUpgrade(socket, 401, 'Authentication token is required');
                return;
            }

            const isBlacklisted = await CacheService.get<boolean>(`jwt:blacklist:${token}`);
            if (isBlacklisted) {
                logger.warn('[DashboardWS] Upgrade attempt with blacklisted token');
                this._rejectUpgrade(socket, 401, 'Token is invalid or logged out');
                return;
            }

            jwt.verify(token, config.jwt.secret) as DecodedToken;

            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request);
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Invalid token';
            logger.warn('[DashboardWS] Upgrade auth failed', { error: message });
            this._rejectUpgrade(socket, 401, message);
        }
    }

    private _extractToken(request: IncomingMessage): string | null {
        if (request.headers.cookie) {
            const parsed = cookie.parse(request.headers.cookie);
            if (parsed.authToken) return parsed.authToken;
        }

        const authHeader = request.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }

        if (request.url) {
            try {
                const urlObj = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
                const queryToken = urlObj.searchParams.get('token');
                if (queryToken) return queryToken;
            } catch (err) {}
        }

        return null;
    }

    private _rejectUpgrade(socket: any, code: number, message: string): void {
        socket.write(
            `HTTP/1.1 ${code} ${message}\r\n` +
            `Connection: close\r\n` +
            `Content-Type: text/plain\r\n\r\n` +
            `${message}`
        );
        socket.destroy();
    }

    private _broadcastToClients(payload: string): void {
        for (const ws of this.clients) {
            if (ws.readyState !== WebSocket.OPEN) {
                this.clients.delete(ws);
                continue;
            }

            // Backpressure guard: if the client's send buffer is congested, force-close
            // the socket with application close code 4000 ("Buffer overflow — resync required")
            // instead of silently dropping the frame.
            //
            // WHY force-close instead of silent drop?
            //   Silent drop leaves the client's in-memory KPI counters diverging from
            //   reality with no signal to recover. Force-closing with code 4000 gives
            //   the frontend an explicit, deterministic trigger to re-fetch a
            //   ground-truth snapshot from PostgreSQL before resuming the live stream.
            //
            // WHY 16 KB?
            //   Each metric event is ~150-200 bytes. 16 KB allows ~80-100 queued frames
            //   before declaring a client too slow. It aligns with Linux TCP kernel buffer
            //   boundaries (sk_buff), so frames below this threshold live in kernel space,
            //   not Node.js heap. Above 32 KB, 1,000 slow clients would consume 32+ MB of
            //   server RAM in unsent queued frames.
            if (ws.bufferedAmount > BACKPRESSURE_THRESHOLD_BYTES) {
                logger.warn('[DashboardWS] Client buffer full — force-closing socket to trigger resync', {
                    bufferedAmount: ws.bufferedAmount,
                    threshold: BACKPRESSURE_THRESHOLD_BYTES,
                });
                // Close code 4000: user-defined application-level code.
                // Frontend can distinguish this from normal close (1000) or server error (1011)
                // and knows to re-fetch the snapshot before re-opening the stream.
                ws.close(4000, 'Buffer overflow — resync required');
                this.clients.delete(ws);
                continue;
            }

            ws.send(payload, (error?: Error) => {
                if (error) {
                    logger.error('[DashboardWS] Failed to send message to client', {
                        error: error.message,
                    });
                    this.clients.delete(ws);
                }
            });
        }
    }


    async connect(): Promise<void> {
        try {
            await this.subscriber.connect();
            logger.info('[DashboardWS] WebSocket server listening on /dashboard-ws');
        } catch (error: unknown) {
            logger.error('[DashboardWS] Failed to connect Redis subscriber', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    async shutdown(): Promise<void> {
        logger.info('[DashboardWS] Shutting down...');

        try {
            if (this.isSubscribed) {
                await this.subscriber.unsubscribe(LIVE_METRICS_CHANNEL);
            }
            await this.subscriber.quit();
        } catch (error: unknown) {
            logger.error('[DashboardWS] Error closing Redis subscriber', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        this.wss.close(() => {
            logger.info('[DashboardWS] WebSocket server closed');
        });
    }
}
