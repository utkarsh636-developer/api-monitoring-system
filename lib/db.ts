import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

class DatabaseConnection {
    private client: PrismaClient | null;
    private isConnecting: boolean;

    constructor() {
        this.client = null;
        this.isConnecting = false;
    }

    /**
     * Connects to PostgreSQL using Prisma and returns the PrismaClient instance
     */
    async connect(): Promise<PrismaClient | null> {
        if (this.client) {
            return this.client;
        }

        // Handle concurrent connection attempts (matching RabbitMQ/Redis logic)
        if (this.isConnecting) {
            await new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isConnecting) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
            return this.client;
        }

        try {
            this.isConnecting = true;
            logger.info("Initializing database connection...");

            // Create a new PrismaClient instance
            const prismaInstance = new PrismaClient({
                log: [
                    { emit: 'event', level: 'query' },
                    { emit: 'event', level: 'info' },
                    { emit: 'event', level: 'warn' },
                    { emit: 'event', level: 'error' },
                ],
            });

            // Bind warning and error events to Winston
            prismaInstance.$on('warn', (e: any) => {
                logger.warn(`Prisma: ${e.message}`);
            });

            prismaInstance.$on('error', (e: any) => {
                logger.error(`Prisma Error: ${e.message}`);
            });

            // Log SQL queries in development mode
            if (process.env.NODE_ENV !== 'production') {
                prismaInstance.$on('query', (e: any) => {
                    logger.debug(`SQL Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
                });
            }

            // Force connection verification
            await prismaInstance.$connect();

            this.client = prismaInstance;
            this.isConnecting = false;
            logger.info("Database connected successfully via Prisma");

            return this.client;
        } catch (error: any) {
            this.isConnecting = false;
            logger.error("Failed to connect to Database via Prisma", error);
            throw error;
        }
    }

    /**
     * Returns the active Prisma Client instance
     */
    getClient(): PrismaClient | null {
        return this.client;
    }

    /**
     * Returns database connection status
     */
    getStatus(): "connected" | "disconnected" {
        if (!this.client) return "disconnected";
        return "connected";
    }

    /**
     * Gracefully disconnects from PostgreSQL
     */
    async close(): Promise<void> {
        try {
            if (this.client) {
                await this.client.$disconnect();
                this.client = null;
                logger.info("Database connection closed");
            }
        } catch (error: any) {
            logger.error("Error in closing Database connection", error);
        }
    }
}

// Declare global type to prevent connection leaks during Next.js hot-reloads
declare global {
    var databaseGlobal: DatabaseConnection | undefined;
}

// Retrieve or instantiate the connection manager singleton
const dbConnection = globalThis.databaseGlobal ?? new DatabaseConnection();

export default dbConnection;

if (process.env.NODE_ENV !== 'production') {
    globalThis.databaseGlobal = dbConnection;
}

// == PRODUCTION ONLY (COMMENTED OUT FOR FUTURE USE) ==
// export default new DatabaseConnection();

