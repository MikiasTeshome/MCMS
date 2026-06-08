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
import mealsRoutes from './modules/meals/meals.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import cafeRoutes from './modules/cafe/cafe.routes.js';
import hrRoutes from './modules/hr/hr.routes.js';
import employeesRoutes from './modules/employees/employees.routes.js';
import selfCheckRoutes from './modules/self-check/self-check.routes.js';

const app = express();

// --- 1. GLOBAL MIDDLEWARES ---

// Security headers integration
app.use(helmet());

// Enable Cross-Origin Resource Sharing with customized settings
app.use(cors({
  // Dynamically allow origins based on environment, configuration, and network patterns
  origin: (origin, callback) => {
    // Allow same‑origin/server-to-server requests
    if (!origin) return callback(null, true);

    // 1. Allow all origins in development mode for seamless local development
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }

    // 2. Normalize and check ALLOWED_ORIGINS and CLIENT_URL configuration
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

    // 3. Dynamically allow local network IP addresses (useful for on-premise college deployments)
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

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging via winston
app.use(loggingMiddleware);

// Active Accept-Language detection
app.use(i18nMiddleware);

// --- 2. SECURITY RATE LIMITING ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter globally to api endpoints
app.use('/api/', apiLimiter);

// --- 3. BUSINESS MODULE ROUTES ---
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/coupons`, couponsRoutes);
app.use(`/api/${config.apiVersion}/meals`, mealsRoutes);
app.use(`/api/${config.apiVersion}/users`, usersRoutes);
app.use(`/api/${config.apiVersion}/audit`, auditRoutes);
app.use(`/api/${config.apiVersion}/cafe`, cafeRoutes);
app.use(`/api/${config.apiVersion}/hr`, hrRoutes);
app.use(`/api/${config.apiVersion}/employees`, employeesRoutes);
app.use(`/api/${config.apiVersion}/self-check`, selfCheckRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Meal Coupon Management System (MCMS) API Server',
    version: '1.0.0',
    status: 'Healthy',
    timestamp: new Date().toISOString(),
  });
});

// --- 4. EXCEPTION & ERROR HANDLERS ---

// 404 Route Not Found Catch-All
app.use((req, res, next) => {
  const error = new Error(`API Endpoint Not Found - [${req.method}] ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Centralized express error handler
app.use(errorHandler);

export default app;
