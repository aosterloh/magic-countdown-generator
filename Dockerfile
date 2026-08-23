# Multi-stage Dockerfile for Magic Countdown Generator
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Production Runner Stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install FFmpeg and SSL certificates for audio-video synthesis & Google API calls
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev
RUN npm install -g tsx

# Copy built frontend, backend server, public assets, and specifications
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/specifications ./specifications
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Ensure dynamic media directories exist
RUN mkdir -p /app/output /app/uploads /app/public/countdown

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["tsx", "server/index.ts"]
