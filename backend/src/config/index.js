import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required when NODE_ENV=production');
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_purposes_only',
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};
