FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine@sha256:3111b113abec80b4a8a3d4b5cebebf61a4cdab019b7e56ca3e6389e6ac4e1c8d AS builder
WORKDIR /build
COPY src/ExcelApi/ExcelApi.csproj ./src/ExcelApi/
RUN dotnet restore src/ExcelApi/ExcelApi.csproj
COPY src/ ./src/
RUN dotnet publish src/ExcelApi/ExcelApi.csproj \
    -c Release -o /app --self-contained \
    -p:PublishReadyToRun=true

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine@sha256:835000ed57badec57b31e8fe1947e34441c5d2e749fa500cf4ded73ebc1e7b3c
RUN apk add --no-cache curl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app .
USER appuser
EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8443/health || exit 1
ENTRYPOINT ["./ExcelApi"]
