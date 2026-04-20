# Build Stage
FROM node:18-slim AS builder

WORKDIR /app

# Copy lock files and package.json
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the SDK
RUN npm run build

# Production Stage
FROM node:18-slim

WORKDIR /app

# Copy build artifacts and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Export variables
ENV NODE_ENV=production

# The SDK is intended to be used as a library, 
# but we can provide a default entry point if needed.
CMD ["node", "dist/index.js"]
