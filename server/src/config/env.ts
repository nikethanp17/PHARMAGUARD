import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    PORT: z.string().default('4000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: z.string().default('http://localhost:3000'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

    ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 chars'),
    REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 chars'),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().default('587'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default('noreply@yourgenes.health'),

    BCRYPT_ROUNDS: z.string().default('12'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = {
    port: parseInt(parsed.data.PORT, 10),
    nodeEnv: parsed.data.NODE_ENV,
    isProd: parsed.data.NODE_ENV === 'production',
    clientUrl: parsed.data.CLIENT_URL,

    mongodbUri: parsed.data.MONGODB_URI,

    accessTokenSecret: parsed.data.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: parsed.data.REFRESH_TOKEN_SECRET,
    accessTokenExpiresIn: parsed.data.ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: parsed.data.REFRESH_TOKEN_EXPIRES_IN,

    smtp: {
        host: parsed.data.SMTP_HOST,
        port: parseInt(parsed.data.SMTP_PORT, 10),
        user: parsed.data.SMTP_USER,
        pass: parsed.data.SMTP_PASS,
    },
    emailFrom: parsed.data.EMAIL_FROM,

    bcryptRounds: parseInt(parsed.data.BCRYPT_ROUNDS, 10),
};
