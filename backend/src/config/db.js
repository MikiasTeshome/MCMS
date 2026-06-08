import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { config } from './index.js';

const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
