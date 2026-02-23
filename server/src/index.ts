import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { env } from './config/env';

async function main(): Promise<void> {
    await connectDB();

    const app = createApp();
    const server = app.listen(env.port, () => {
        console.log(`\n🧬  PharmaGuard Auth Server`);
        console.log(`🚀  Running at http://localhost:${env.port}`);
        console.log(`🌍  Environment: ${env.nodeEnv}`);
        console.log(`🔌  MongoDB: connected`);
        console.log(`\n📡  Endpoints:`);
        console.log(`   POST   /api/auth/register`);
        console.log(`   POST   /api/auth/login`);
        console.log(`   POST   /api/auth/logout`);
        console.log(`   POST   /api/auth/refresh`);
        console.log(`   GET    /api/auth/me`);
        console.log(`   POST   /api/auth/verify-email`);
        console.log(`   POST   /api/auth/forgot-password`);
        console.log(`   POST   /api/auth/reset-password`);
        console.log(`   PATCH  /api/auth/change-password\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n🛑  ${signal} received — shutting down gracefully`);
        server.close(async () => {
            await disconnectDB();
            process.exit(0);
        });
        // Force exit after 10s
        setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason);
        shutdown('unhandledRejection');
    });
}

main().catch(err => {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
});
