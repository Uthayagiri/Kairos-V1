import { buildApp } from './app.js';
import { config } from './config/env.js';
import { dbService } from './services/db.service.js';

async function startServer() {
  try {
    const app = await buildApp();

    // Attempt lazy database connection (does not block server startup if DB is offline)
    dbService.connect().catch((err) => {
      app.log.warn({ err }, 'Initial PostgreSQL connection deferred');
    });

    const address = await app.listen({
      port: config.PORT,
      host: config.HOST
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   KAIROS BACKEND SERVICE                      ║
║                      (Phase E.1 Foundation)                   ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Server listening at: ${address.padEnd(36)} ║
║  🩺 Health check:        ${(address + '/health').padEnd(36)} ║
║  📡 API v1 Health:       ${(address + '/api/v1/health').padEnd(36)} ║
║  🌍 Environment:         ${config.NODE_ENV.padEnd(36)} ║
║  🔌 Port:                ${String(config.PORT).padEnd(36)} ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // Graceful Shutdown Handlers
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
        try {
          await app.close();
          await dbService.disconnect();
          console.log('✅ Server and database disconnected cleanly.');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during graceful shutdown:', err);
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error);
    process.exit(1);
  }
}

// Start server if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  startServer();
}

export { startServer };
