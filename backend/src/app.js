import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import loggingMiddleware from './middlewares/logging.middleware.js';
import { i18nMiddleware } from './middlewares/i18n.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

// Module routers imports
import authRoutes from './modules/auth/auth.routes.js';
import couponsRoutes from './modules/coupons/coupons.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import hrRoutes from './modules/hr/hr.routes.js';
import employeesRoutes from './modules/employees/employees.routes.js';
import holidaysRoutes from './modules/holidays/holidays.routes.js';
import campusesRoutes from './modules/campuses/campuses.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';

const app = express();

// Nginx / reverse proxy: required for accurate rate-limit IPs
app.set('trust proxy', 1);

// --- 1. GLOBAL MIDDLEWARES ---

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }

    const allowedOrigins = [];
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(
        ...process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, ''))
      );
    }
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL.trim().replace(/\/$/, ''));
    }
    if (config.clientUrl) {
      allowedOrigins.push(config.clientUrl.trim().replace(/\/$/, ''));
    }

    const normalizedOrigin = origin.trim().replace(/\/$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin);
    if (isLocal) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  credentials: true,
}));

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use(loggingMiddleware);

app.use(i18nMiddleware);

// --- 2. SECURITY RATE LIMITING ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// --- 3. BUSINESS MODULE ROUTES ---
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/coupons`, couponsRoutes);
app.use(`/api/${config.apiVersion}/users`, usersRoutes);
app.use(`/api/${config.apiVersion}/audit`, auditRoutes);
app.use(`/api/${config.apiVersion}/hr`, hrRoutes);
app.use(`/api/${config.apiVersion}/employees`, employeesRoutes);
app.use(`/api/${config.apiVersion}/holidays`, holidaysRoutes);
app.use(`/api/${config.apiVersion}/campuses`, campusesRoutes);
app.use(`/api/${config.apiVersion}/dashboard`, dashboardRoutes);

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Meal Coupon Management System (MCMS) API Server',
    version: '1.0.0',
    status: 'Healthy',
    timestamp: new Date().toISOString(),
  });
});

// --- 4. EXCEPTION & ERROR HANDLERS ---

app.use((req, res, next) => {
  const error = new Error(`API Endpoint Not Found - [${req.method}] ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

export default app;
