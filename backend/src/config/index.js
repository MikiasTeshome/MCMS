import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv !== 'development' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv,
  apiVersion: process.env.API_VERSION || 'v1',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'development' ? 'fallback_secret_for_dev_purposes_only' : ''),
  jwtExpire: process.env.JWT_EXPIRE || '24h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  // Scan + issue only. High enough for a lunch queue on a shared college IP.
  cafeRateLimitMax: parseInt(process.env.CAFE_RATE_LIMIT_MAX || '3000', 10),
};
