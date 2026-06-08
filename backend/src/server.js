import app from './app.js';
import { config } from './config/index.js';
import logger from './utils/logger.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 API Server successfully started in [${config.nodeEnv}] mode`);
  logger.info(`📡 Listening on http://localhost:${PORT}`);
});

// Gracefully handle port-in-use errors instead of crashing
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use. Kill the other process or change PORT in .env`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Handle uncaught exceptions globally to prevent silent crashes
process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Promise Rejection: ${err.message}`);
  logger.error(err.stack || '');
  // Gracefully close server & exit process
  server.close(() => process.exit(1));
});
