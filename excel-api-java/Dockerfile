FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY pom.xml ./
RUN apk add --no-cache maven && mvn dependency:go-offline -B
COPY src/ ./src/
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/excel-api-*.jar app.jar
USER appuser
EXPOSE 8443
ENTRYPOINT ["java", "-jar", "app.jar"]
