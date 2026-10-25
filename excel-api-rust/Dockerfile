FROM rust:1.89-alpine@sha256:4b800f2e72e04be908e5f634c504c741bd943b763d1d8ad7b096cc340e1b5b46 AS builder
WORKDIR /build
RUN apk add --no-cache musl-dev
COPY Cargo.toml Cargo.lock ./
COPY src/ ./src/
COPY resources/ ./resources/
RUN cargo build --release

FROM alpine:3.21@sha256:ee16d92f96db08d9d2d07da48555a27f3a69d8f0759021dbc601195ed0d2b5bd
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && apk add --no-cache wget
WORKDIR /app
COPY --from=builder /build/target/release/excel-api-rust /app/excel-api-rust
COPY config/config.example.yaml /app/config/config.yaml
COPY config/access.example.yaml /app/config/access.yaml
USER appuser
EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8443/health || exit 1
CMD ["/app/excel-api-rust"]
