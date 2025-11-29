import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AdminUserResponse {
  id: string;
  email: string;
  name: string;
  roleId?: string;
  roleName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AdminRoleResponse {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissionCount: number;
  userCount: number;
  permissions: {
    permissionCode: string;
    description?: string;
  }[];
}

/**
 * Get all admin users
 */
export async function getAllAdminUsers(): Promise<AdminUserResponse[]> {
  const users = await prisma.adminUser.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((user: any) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role?.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  }));
}

/**
 * Get admin user by ID
 */
export async function getAdminUser(userId: string): Promise<AdminUserResponse> {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } } },
  });

  if (!user) {
    throw new Error('Admin user not found');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId || undefined,
    roleName: user.role?.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Create new admin user
 */
export async function createAdminUser(
  email: string,
  name: string,
  passwordHash: string,
  roleId?: string
): Promise<AdminUserResponse> {
  // Check if email already exists
  const existing = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error('Email already in use');
  }

  const user = await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash,
      roleId,
    },
    include: { role: true },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId || undefined,
    roleName: user.role?.name,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Update admin user
 */
export async function updateAdminUser(
  userId: string,
  updates: {
    name?: string;
    roleId?: string;
    isActive?: boolean;
  }
): Promise<AdminUserResponse> {
  const user = await prisma.adminUser.update({
    where: { id: userId },
    data: updates,
    include: { role: true },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId || undefined,
    roleName: user.role?.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Delete admin user
 */
export async function deleteAdminUser(userId: string): Promise<boolean> {
  await prisma.adminUser.delete({
    where: { id: userId },
  });

  return true;
}

/**
 * Update last login time
 */
export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

/**
 * Get all admin roles
 */
export async function getAllAdminRoles(): Promise<AdminRoleResponse[]> {
  const roles = await prisma.adminRole.findMany({
    include: {
      permissions: true,
      users: true,
    },
    orderBy: { name: 'asc' },
  });

  return roles.map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description || undefined,
    isSystemRole: role.isSystemRole,
    permissionCount: role.permissions.length,
    userCount: role.users.length,
    permissions: role.permissions.map((p: any) => ({
      permissionCode: p.permissionCode,
      description: p.description,
    })),
  }));
}

/**
 * Create admin role
 */
export async function createAdminRole(
  name: string,
  description?: string,
  permissionCodes: string[] = []
): Promise<AdminRoleResponse> {
  const role = await prisma.adminRole.create({
    data: {
      name,
      description,
      permissions: {
        createMany: {
          data: permissionCodes.map((code) => ({
            permissionCode: code,
          })),
        },
      },
    },
    include: { permissions: true, users: true },
  });

  return {
    id: role.id,
    name: role.name,
    description: role.description || undefined,
    isSystemRole: role.isSystemRole,
    permissionCount: role.permissions.length,
    userCount: role.users.length,
    permissions: role.permissions.map((p: any) => ({
      permissionCode: p.permissionCode,
      description: p.description,
    })),
  };
}

/**
 * Log admin activity
 */
export async function logAdminActivity(
  adminId: string,
  action: string,
  description: string,
  entityType: string,
  entityId?: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  await prisma.adminActivityLog.create({
    data: {
      adminId,
      action,
      description,
      entityType,
      entityId,
      oldValue,
      newValue,
    },
  });
}

/**
 * Get admin activity log
 */
export async function getAdminActivityLog(
  limit = 100,
  offset = 0
): Promise<{
  logs: any[];
  total: number;
}> {
  const [logs, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      include: {
        admin: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.adminActivityLog.count(),
  ]);

  return {
    logs: logs.map((log: any) => ({
      id: log.id,
      adminEmail: log.admin.email,
      adminName: log.admin.name,
      action: log.action,
      description: log.description,
      entityType: log.entityType,
      entityId: log.entityId || undefined,
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
  };
}

/**
 * Get user permissions (check if user can perform action)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } } },
  });

  if (!user) {
    return [];
  }

  const permissions = user.role?.permissions.map((p: any) => p.permissionCode) || [];
  const customPermissions = user.customPermissions || [];

  return [...permissions, ...customPermissions];
}

/**
 * Initialize default admin roles (should run once on setup)
 */
export async function initializeDefaultRoles(): Promise<void> {
  // Check if roles already exist
  const existingRoles = await prisma.adminRole.count();
  if (existingRoles > 0) {
    return;
  }

  // Define default roles
  const defaultRoles = [
    {
      name: 'super_admin',
      description: 'Full system access',
      permissions: [
        'view_submissions',
        'accept_submissions',
        'reject_submissions',
        'manage_inventory',
        'manage_pricing_policies',
        'view_analytics',
        'manage_users',
        'manage_roles',
        'view_audit_log',
        'system_configuration',
      ],
    },
    {
      name: 'manager',
      description: 'Manage submissions and inventory',
      permissions: [
        'view_submissions',
        'accept_submissions',
        'reject_submissions',
        'manage_inventory',
        'manage_pricing_policies',
        'view_analytics',
      ],
    },
    {
      name: 'viewer',
      description: 'Read-only access',
      permissions: ['view_submissions', 'view_analytics', 'view_audit_log'],
    },
  ];

  for (const roleData of defaultRoles) {
    await createAdminRole(
      roleData.name,
      roleData.description,
      roleData.permissions
    );

    // Mark system roles
    await prisma.adminRole.update({
      where: { name: roleData.name },
      data: { isSystemRole: true },
    });
  }
}
