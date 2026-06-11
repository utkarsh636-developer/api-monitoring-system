import { Role } from '@prisma/client';

export const ROLES: Role[] = [
    Role.SUPER_ADMIN,
    Role.CLIENT_ADMIN,
    Role.CLIENT_VIEWER,
];

export const CLIENT_ROLES: Role[] = [
    Role.CLIENT_ADMIN,
    Role.CLIENT_VIEWER,
];

export const APPLICATION_ROLES = {
    SUPER_ADMIN: Role.SUPER_ADMIN,
    CLIENT_VIEWER: Role.CLIENT_VIEWER,
} as const; // 'as const' makes the object properties read-only

// Type Guards: verify if any input string is a valid Role enum value
export const isValidClientRole = (role: any): role is Role => {
    return CLIENT_ROLES.includes(role as Role);
};

export const isValidRole = (role: any): role is Role => {
    return ROLES.includes(role as Role);
};
