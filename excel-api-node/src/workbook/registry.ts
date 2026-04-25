// Workbook registry mapping IDs to file paths

import * as path from 'path';
import * as fs from 'fs';
import type { Config } from '../config/types.js';

export interface WorkbookInfo {
  id: string;
  filename: string;
  readonly: boolean;
  path: string;
  modified_at: string;
  size_bytes: number;
}

export class WorkbookRegistry {
  private workbooks: Map<string, WorkbookInfo> = new Map();
  private baseDir: string;

  constructor(config: Config) {
    this.baseDir = config.registry.directory;
    for (const entry of config.registry.workbooks) {
      const fullPath = path.join(this.baseDir, entry.path);
      if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Workbook file not found: ${fullPath}`);
        continue;
      }

      const stats = fs.statSync(fullPath);
      this.workbooks.set(entry.id, {
        id: entry.id,
        filename: entry.path,
        readonly: entry.readonly,
        path: fullPath,
        modified_at: stats.mtime.toISOString(),
        size_bytes: stats.size,
      });
    }
  }

  get(id: string): WorkbookInfo | undefined {
    return this.workbooks.get(id);
  }

  getAll(): WorkbookInfo[] {
    return Array.from(this.workbooks.values());
  }

  exists(id: string): boolean {
    return this.workbooks.has(id);
  }

  refreshModifiedAt(id: string): void {
    const workbook = this.workbooks.get(id);
    if (workbook && fs.existsSync(workbook.path)) {
      const stats = fs.statSync(workbook.path);
      workbook.modified_at = stats.mtime.toISOString();
      workbook.size_bytes = stats.size;
    }
  }
}

let registryInstance: WorkbookRegistry | null = null;

export function initRegistry(config: Config): WorkbookRegistry {
  if (!registryInstance) {
    registryInstance = new WorkbookRegistry(config);
  }
  return registryInstance;
}

export function getRegistry(): WorkbookRegistry {
  if (!registryInstance) {
    throw new Error('Registry not initialized. Call initRegistry first.');
  }
  return registryInstance;
}
