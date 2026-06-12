import { isValidRole } from "../../../shared/constants/roles";

export interface ValidationRule {
    required: boolean;
    minLength?: number;
    custom?: (value: any) => string | null;
}

export const onboardSuperAdminSchema: Record<string, ValidationRule> = {
    username: {
        required: true,
    },
    email: {
        required: true,
    },
    password: {
        required: true,
        minLength: 6
    }
};

export const registrationSchema: Record<string, ValidationRule> = {
    username: {
        required: true,
    },
    email: {
        required: true,
    },
    password: {
        required: true,
        minLength: 6
    },
    role: {
        required: false,
        custom: (value: any): string | null => {
            if (!value) return null;
            return isValidRole(value) ? null : 'Invalid role';
        }
    },
};

export const loginSchema: Record<string, ValidationRule> = {
    username: { required: true },
    password: { required: true },
};
