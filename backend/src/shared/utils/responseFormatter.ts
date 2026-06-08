interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T | null;
    error?: any;
    statusCode?: number;
    timestamp: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class ResponseFormatter{
    static success<T>(data: T | null = null, message: string = "Success", statusCode: number = 200): ApiResponse<T> {
        return{
            success: true,
            message,
            data,
            statusCode,
            timestamp: new Date().toISOString() 
        }
    }

    static error(message: string = "Internal Server Error", statusCode: number = 500, error: any = null): ApiResponse {
        return{
            success: false,
            message,
            error,
            statusCode,
            timestamp: new Date().toISOString() 
        }
    }

    static validation(error: any = null): ApiResponse {
        return{
            success: false,
            message: "Validation failed",
            error,
            statusCode: 400,
            timestamp: new Date().toISOString() 
        }
    }

    static paginated<T>(data: T[] | null = null, page: number, limit: number, total: number): ApiResponse<T[]> {
        return{
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            timestamp: new Date().toISOString() 
        }
    }
}

export default ResponseFormatter;