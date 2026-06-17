#!/usr/bin/env bash

# ==============================================================================
# MCMS AUTOMATED DEPLOYMENT SCRIPT FOR VPS (UBUNTU)
# ==============================================================================
# This script automates pulling changes from GitHub, installing dependencies,
# running migrations, compiling the frontend, and reloading processes.
# Run this from the repository root: ./deploy.sh

set -e # Exit immediately if any command fails

# Text Styling Helper Functions
INFO() { echo -e "\e[34m[INFO]\e[0m $*"; }
SUCCESS() { echo -e "\e[32m[SUCCESS]\e[0m $*"; }
WARNING() { echo -e "\e[33m[WARNING]\e[0m $*"; }
ERROR() { echo -e "\e[31m[ERROR]\e[0m $*"; exit 1; }

INFO "Starting MCMS Production Deployment..."

# 1. Check for root .env file
if [ ! -f .env ]; then
    ERROR "Root '.env' file not found!\n       Please copy .env.production.example to .env and configure it before deploying."
fi

# 2. Pull latest code from current branch
INFO "Pulling latest code from GitHub..."
# Get active branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)
INFO "Active Git branch: $BRANCH"
git pull origin "$BRANCH"

# 3. Synchronize environment files to backend and frontend
INFO "Syncing environment variables to workspaces..."
cp .env backend/.env
cp .env frontend/.env
SUCCESS "Environment files synced successfully."

# 4. Clean Install dependencies
INFO "Installing workspace dependencies..."
npm ci --prefix backend
npm ci --prefix frontend
SUCCESS "All dependencies installed cleanly."

# 5. Database operations (Prisma Client generation & migration)
INFO "Generating Prisma Client..."
npx prisma generate --schema=backend/prisma/schema.prisma

INFO "Applying database migrations..."
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
SUCCESS "Database schema is up to date."

# 6. Build Frontend Static Bundle
INFO "Compiling React frontend..."
npm run build --prefix frontend
SUCCESS "Frontend compiled successfully to frontend/dist/."

# 7. Reload PM2 processes
INFO "Reloading PM2 applications..."
if pm2 describe mcms-backend > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
    SUCCESS "PM2 backend reloaded successfully (Zero-downtime)."
else
    pm2 start ecosystem.config.cjs --env production
    SUCCESS "PM2 backend started successfully."
fi

# Save PM2 state to resurrect on server reboot
pm2 save

# 8. Reload Nginx to ensure configuration updates (requires permissions)
INFO "Attempting to reload Nginx..."
if command -v sudo >/dev/null 2>&1; then
    if sudo systemctl reload nginx; then
        SUCCESS "Nginx reloaded successfully."
    else
        WARNING "Could not reload Nginx via systemctl. Please reload manually: 'sudo systemctl reload nginx'"
    fi
else
    WARNING "sudo command not available. Please make sure Nginx is reloaded: 'systemctl reload nginx'"
fi

echo -e "\n\e[32;1m===================================================\e[0m"
echo -e "\e[32;1m      MCMS DEPLOYMENT COMPLETED SUCCESSFULLY!      \e[0m"
echo -e "\e[32;1m===================================================\e[0m"
echo -e "Backend is running on port 5000 (via PM2)"
echo -e "Frontend static files are ready in frontend/dist/"
