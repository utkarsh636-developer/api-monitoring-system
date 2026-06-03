import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prismaClientSingleton = () => {
    const prisma = new PrismaClient({
    // Enable logging for query execution and warnings/errors
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
    ],
    });

    // Log Prisma warnings to Winston
    prisma.$on('warn', (e: any) => {
        logger.warn(`Prisma: ${e.message}`);
    });

    // Log Prisma errors to Winston
    prisma.$on('error', (e: any) => {
        logger.error(`Prisma Error: ${e.message}`);
    });

    // Log SQL queries in development mode for easy debugging
    if (process.env.NODE_ENV !== 'production') {
        prisma.$on('query', (e: any) => {
            logger.debug(`SQL Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
        });
    }

    return prisma;
};

// Global type declaration for hot-reloads
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Ensure we only have one Prisma connection pool open
const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = db;
}
