# Excel API Java

Java/Spring Boot implementation of the Excel API using Apache POI.

## Quick Start

```bash
mvn spring-boot:run
```

## Build

```bash
mvn package
docker build -t excel-api-java .
```

## Configuration

Copy `config/config.example.yaml` to your config path and adjust settings.
Copy `config/access.example.yaml` for sensitive configuration.

Set `CONFIG_PATH` and `ACCESS_PATH` environment variables to point to your files.

## Development Standard

See `docs/standard/java-spring-maven-development.md` in the repository root.
