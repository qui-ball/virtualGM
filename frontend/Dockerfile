# Build arguments for flexibility
ARG NODE_VERSION=24.13.0

# Use Node.js LTS image as base
FROM node:${NODE_VERSION}-slim

# Set working directory
WORKDIR /app

# Install system dependencies (curl needed for health checks)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci || npm install

# Copy the rest of the application
COPY . .

# Use existing node user (UID 1000) for security
# The node image already has a non-root user, just ensure ownership
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose Vite dev server port
EXPOSE 5173

# Set environment variables
ENV NODE_ENV=development \
    VITE_HOST=0.0.0.0 \
    VITE_PORT=5173

# Health check - verify Vite dev server is accessible
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Start Vite development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
