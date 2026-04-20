FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /build
COPY src/ExcelApi/ExcelApi.csproj ./src/ExcelApi/
RUN dotnet restore src/ExcelApi/ExcelApi.csproj
COPY src/ ./src/
RUN dotnet publish src/ExcelApi/ExcelApi.csproj \
    -c Release -o /app --self-contained \
    -p:PublishReadyToRun=true

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app .
USER appuser
EXPOSE 8443
ENTRYPOINT ["./ExcelApi"]
