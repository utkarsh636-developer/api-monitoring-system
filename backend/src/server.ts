import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from "./shared/config/index";
import logger from "./shared/config/logger";
import prisma from "./shared/config/prisma";
import redis from "./shared/config/redis";
import rabbitmq from "./shared/config/rabbitmq";
import errorHandler from "./shared/middlewares/errorHandler"
import ResponseFormatter from "./shared/utils/responseFormatter"

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next();
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
            'Service is healthy'
        )
    );
});

app.use('/', (req: Request, res: Response) => {
    res.status(200).json(
        ResponseFormatter.success(
            {
                service: 'API Hit Monitoring System',
                version: '1.0.0',
                endpoints: {
                    health: '/health',
                    auth: '/api/auth',
                    ingest: '/api/hit',
                    analytics: '/api/analytics',
                },
            },
            'API Hit Monitoring Service'
        )
    );
});

app.use((req: Request, res: Response) => {
    res.status(404).json(ResponseFormatter.error("Endpoint not found", 404));
})

app.use(errorHandler);