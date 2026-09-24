import { prisma } from '../db/prisma.js';

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Attempts to establish a connection to PostgreSQL.
   */
  public async connect(): Promise<boolean> {
    try {
      await prisma.$connect();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      console.warn('⚠️ PostgreSQL connection failed (database may be offline):', (error as Error).message);
      return false;
    }
  }

  /**
   * Gracefully disconnects from PostgreSQL.
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      try {
        await prisma.$disconnect();
        this.isConnected = false;
      } catch (error) {
        console.error('Error disconnecting from database:', error);
      }
    }
  }

  /**
   * Checks database reachability via lightweight query.
   */
  public async checkHealth(): Promise<{ isHealthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        isHealthy: true,
        latencyMs: Date.now() - start
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: (error as Error).message
      };
    }
  }

  public getClient() {
    return prisma;
  }
}

export const dbService = DatabaseService.getInstance();
