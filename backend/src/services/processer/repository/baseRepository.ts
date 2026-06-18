export interface BaseRepositoryDependencies {
    logger?: {
        info: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
        debug?: (...args: any[]) => void;
    };
}

export abstract class BaseRepository {
    protected logger: NonNullable<BaseRepositoryDependencies['logger']>;

    constructor({ logger = console }: BaseRepositoryDependencies = {}) {
        this.logger = logger;
    }

    abstract save(...args: any[]): Promise<any>;

    abstract find(...args: any[]): Promise<any>;

    abstract count(...args: any[]): Promise<any>;
    
    abstract deleteOldHits(...args: any[]): Promise<any>;
}

