#!/usr/bin/env bash
set -euo pipefail

SOURCE="docs/contract/openapi.yaml"

TARGETS=(
  "excel-api-node/resources/openapi.yaml"
  "excel-api-java/src/main/resources/openapi.yaml"
  "excel-api-csharp/src/ExcelApi/Resources/openapi.yaml"
)

if [[ ! -f "$SOURCE" ]]; then
  echo "Source file not found: $SOURCE" >&2
  exit 1
fi

SOURCE_HASH=$(sha256sum "$SOURCE" | cut -d' ' -f1)

for target in "${TARGETS[@]}"; do
  if [[ -f "$target" ]]; then
    TARGET_HASH=$(sha256sum "$target" | cut -d' ' -f1)
    if [[ "$SOURCE_HASH" == "$TARGET_HASH" ]]; then
      echo "  [OK] $target (up to date)"
      continue
    fi
  fi
  mkdir -p "$(dirname "$target")"
  cp "$SOURCE" "$target"
  echo "  [SYNC] $target"
done
