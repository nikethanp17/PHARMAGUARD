import mongoose, { connect, connection } from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
    try {
        await connect(env.mongodbUri);
        console.log('✅  MongoDB connected:', connection.host);
    } catch (err) {
        console.error('❌  MongoDB connection failed:', err);
        process.exit(1);
    }
}

// Graceful disconnect
export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
    console.log('🔌  MongoDB disconnected');
}
