import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client to avoid connection pool issues
let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance === null) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance !== null) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

// Export Prisma client for convenience
export const prisma = getPrismaClient();
