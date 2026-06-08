# Base Stage
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma/
RUN npx prisma generate

# Development Stage
FROM base AS development
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

# Production Builder Stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm prune --production

# Production Runner Stage
FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000
CMD ["npm", "run", "start"]
