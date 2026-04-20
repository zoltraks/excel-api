# Excel API C#

C#/ASP.NET 8 implementation of the Excel API using ClosedXML with ReadyToRun compilation.

## Quick Start

```bash
cd src/ExcelApi
dotnet run
```

## Build

```bash
dotnet build
docker build -t excel-api-csharp .
```

## Configuration

Copy `config/config.example.yaml` to your config path and adjust settings.
Copy `config/access.example.yaml` for sensitive configuration.

Set `CONFIG_PATH` and `ACCESS_PATH` environment variables to point to your files.

## Development Standard

See `docs/standard/csharp-aspnet-development.md` in the repository root.
