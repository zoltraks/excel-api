FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /build
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY resources/ ./resources/
RUN npm run build

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ wget
RUN npm ci --omit=dev
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/resources ./resources
USER appuser
EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8443/health || exit 1
CMD ["node", "dist/server.js"]
