# Excel API Node

Node.js/TypeScript implementation of the Excel API using ExcelJS.

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
docker build -t excel-api-node .
```

## Configuration

Copy `config/config.example.yaml` to your config path and adjust settings.
Copy `config/access.example.yaml` for sensitive configuration.

Set `CONFIG_PATH` and `ACCESS_PATH` environment variables to point to your files.

## Development Standard

See `docs/standard/ts-node-development.md` in the repository root.
