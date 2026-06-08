import logger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';
import { config } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`${err.name || 'Error'}: ${err.message}`);
  
  if (config.nodeEnv === 'development') {
    logger.error(err.stack);
  }

  // Handle Prisma Specific errors (P2002 Unique constrain, etc)
  if (err.code === 'P2002') {
    return errorResponse(res, 400, 'Database conflict - resource already exists', {
      fields: err.meta?.target || [],
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(
    res,
    statusCode,
    message,
    config.nodeEnv === 'development' ? { stack: err.stack } : null
  );
};
