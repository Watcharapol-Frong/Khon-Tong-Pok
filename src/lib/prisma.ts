import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules on every file save, which would
// otherwise instantiate a brand new PrismaClient (and a new DB connection
// pool) each time — quickly exhausting Postgres's connection limit.
// Stashing the instance on `globalThis` survives the module reload, so
// dev mode reuses the same client instead of leaking connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
