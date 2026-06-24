import axios, { AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
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

export interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    clientId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface LoginCredentials {
    username: string;
    password?: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password?: string;
    role?: string;
}

export interface DashboardStats {
    totalHits: number;
    avgLatency: number;
    errorRate: number;
    errorHits: number;
    successHits: number;
    uniqueServices: number;
    uniqueEndpoints: number;
}

export interface TopEndpoint {
    endpoint: string;
    method: string;
    hits: number;
    avgLatency: number;
    errorRate: number;
}

export interface RecentActivity {
    id: string;
    serviceName: string;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    timestamp: string;
}

export interface DashboardData {
    stats: DashboardStats;
    topEndpoints: TopEndpoint[];
    recentActivity: RecentActivity[];
}

export interface Client {
    id: string;
    name: string;
    slug: string;
    email: string;
    description?: string | null;
    website?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    dataRetentionDays: number;
    alertsEnabled: boolean;
    timezone: string;
}

export interface ClientInput {
    name: string;
    email: string;
    description?: string;
    website?: string;
}

export interface ApiKey {
    id: string;
    key: string;
    name: string;
    clientId: string;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string | null;
    environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'TESTING';
    description?: string | null;
}

export interface ApiKeyInput {
    name: string;
    expiresAt?: string;
    environment?: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT' | 'TESTING';
    description?: string;
}


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Response Interceptor for handling auth failures gracefully
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
        // Checks if the failed API request was going to an authentication route
        const isAuthRoute = error.config?.url?.includes('/auth/');
        
        // If the API fails and it was not a login/register request, 
        // it means the user was logged in, 
        // but their token is now invalid (either expired after 24 hours, or blacklisted because they logged out).
        if (error.response?.status === 401 && !isAuthRoute) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('auth:unauthorized'));
            }
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<ApiResponse<User>> => {
        const response = await api.post<ApiResponse<User>>('/auth/login', credentials);
        return response.data;
    },
    register: async (userData: RegisterData): Promise<ApiResponse<User>> => {
        const response = await api.post<ApiResponse<User>>('/auth/register', userData);
        return response.data;
    },
    getProfile: async (options?: { signal?: AbortSignal }): Promise<ApiResponse<User>> => {
        const response = await api.get<ApiResponse<User>>('/auth/profile', { signal: options?.signal });
        return response.data;
    },
    logout: async (): Promise<ApiResponse<Record<string, never>>> => {
        const response = await api.post<ApiResponse<Record<string, never>>>('/auth/logout');
        return response.data;
    },
    updateProfile: async (profileData: Partial<User>): Promise<ApiResponse<User>> => {
        const response = await api.put<ApiResponse<User>>('/auth/profile', profileData);
        return response.data;
    },
};

export const analyticsApi = {
    getDashboard: async (): Promise<ApiResponse<DashboardData>> => {
        const response = await api.get<ApiResponse<DashboardData>>('/analytics/dashboard');
        const payload = response.data || {};

        if (payload.success && payload.data) {
            payload.data.stats = payload.data.stats ?? {
                totalHits: 0,
                avgLatency: 0,
                errorRate: 0,
                errorHits: 0,
                successHits: 0,
                uniqueServices: 0,
                uniqueEndpoints: 0,
            };
            payload.data.topEndpoints = payload.data.topEndpoints ?? [];
            payload.data.recentActivity = payload.data.recentActivity ?? [];
        }

        return payload;
    },
    getStats: async (params?: Record<string, any>): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/analytics/stats', { params });
        return response.data;
    },
    getTopEndpoints: async (params?: Record<string, any>): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/analytics/top-endpoints', { params });
        return response.data;
    },
    getTimeSeries: async (params?: Record<string, any>): Promise<ApiResponse<any>> => {
        const response = await api.get<ApiResponse<any>>('/analytics/time-series', { params });
        return response.data;
    },
};

export const clientApi = {
    getCurrentClient: async (): Promise<ApiResponse<Client>> => {
        const response = await api.get<ApiResponse<Client>>('/clients/current');
        return response.data;
    },
    getClientDashboard: async (clientId?: string): Promise<ApiResponse<any>> => {
        const params = clientId ? { clientId } : {};
        const response = await api.get<ApiResponse<any>>('/clients/dashboard', { params });
        return response.data;
    },
    createClient: async (clientData: ClientInput): Promise<ApiResponse<Client>> => {
        const response = await api.post<ApiResponse<Client>>('/admin/clients', clientData);
        return response.data;
    },
    getClients: async (params?: Record<string, any>): Promise<ApiResponse<Client[]>> => {
        const response = await api.get<ApiResponse<Client[]>>('/admin/clients', { params });
        return response.data;
    },
    createApiKey: async (clientId: string, keyData: ApiKeyInput): Promise<ApiResponse<ApiKey>> => {
        const response = await api.post<ApiResponse<ApiKey>>(`/admin/clients/${clientId}/api-keys`, keyData);
        return response.data;
    },
    getClientApiKeys: async (clientId: string): Promise<ApiResponse<ApiKey[]>> => {
        const response = await api.get<ApiResponse<ApiKey[]>>(`/admin/clients/${clientId}/api-keys`);
        return response.data;
    },
};

export default api;
