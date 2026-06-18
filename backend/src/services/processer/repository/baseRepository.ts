export interface BaseRepositoryDependencies {
    logger?: {
        info: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
        debug?: (...args: any[]) => void;
    };
}

export class BaseRepository {
    protected logger: NonNullable<BaseRepositoryDependencies['logger']>;

    constructor({ logger = console }: BaseRepositoryDependencies = {}) {
        this.logger = logger;
    }

    async save(...args: any[]): Promise<any> {
        throw new Error('Method not implemented: save');
    }

    async find(...args: any[]): Promise<any> {
        throw new Error('Method not implemented: find');
    }

    async count(...args: any[]): Promise<any> {
        throw new Error('Method not implemented: count');
    }

    async deleteOldHits(...args: any[]): Promise<any> {
        throw new Error('Method not implemented: deleteOldHits');
    }
}
