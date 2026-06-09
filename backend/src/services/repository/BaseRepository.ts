export default class BaseRepository {
    protected model: any;

    constructor(model: any) {
        this.model = model;
    }

    async create(data: any): Promise<any> {
        throw new Error("Method not implemented");
    }

    async findById(id: string): Promise<any> {
        throw new Error('Method not implemented');
    }

    async findByUsername(username: string): Promise<any> {
        throw new Error('Method not implemented');
    }

    async findByEmail(email: string): Promise<any> {
        throw new Error('Method not implemented');
    }

    async findAll(): Promise<any[]> {
        throw new Error('Method not implemented');
    }
}
