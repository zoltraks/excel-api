FROM eclipse-temurin:21-jdk-alpine@sha256:0bfc69a4758a86710e5c474032d28400a8bd00874766f9e8b1642ac2fd293159 AS builder
WORKDIR /build
COPY pom.xml ./
RUN apk add --no-cache maven && mvn dependency:go-offline -B
COPY src/ ./src/
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine@sha256:51ab5e3302e7141ce665ca3ea85e8b5cd648eafbc3c0c90dd79d6537684e4555
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /var/log/excel-api && chown appuser:appgroup /var/log/excel-api
WORKDIR /app
COPY --from=builder /build/target/excel-api-*.jar app.jar
USER appuser
EXPOSE 8443
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8443/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
