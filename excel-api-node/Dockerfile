FROM node:22-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
COPY resources/ ./resources/
RUN npm run build

FROM node:22-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ wget
RUN npm ci --omit=dev
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/resources ./resources
USER appuser
EXPOSE 8443
CMD ["node", "dist/server.js"]
