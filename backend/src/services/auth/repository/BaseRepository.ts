/**
 * BaseRepository serves as an abstract class that defines the structure for repository classes.
 * It uses generics:
 * - T: The model type (e.g. User, Client)
 * - TCreateInput: The database input structure for creation (e.g. Prisma.UserCreateInput)
 */
export default abstract class BaseRepository<T, TCreateInput = any> {
    protected abstract get model(): any;

    constructor() {}

    // Abstract methods have no body. Subclasses MUST implement them.
    abstract create(data: TCreateInput): Promise<T>;

    abstract findById(id: string): Promise<T | null>;

    abstract findByUsername(username: string): Promise<T | null>;

    abstract findByEmail(email: string): Promise<T | null>;

    abstract findAll(): Promise<T[]>;

    abstract update(id: string, data: any): Promise<T>;
}
