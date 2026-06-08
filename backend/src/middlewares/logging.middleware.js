import morgan from 'morgan';
import logger from '../utils/logger.js';

// Create a custom morgan stream that writes into Winston logger
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Morgan logger configuration
const loggingMiddleware = morgan(
  ':remote-addr - :method :url :status :res[content-length] - :response-time ms',
  { stream }
);

export default loggingMiddleware;
