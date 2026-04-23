// Configuration loader with validation

import * as fs from 'fs';
import * as yaml from 'yaml';
import { z } from 'zod';
import type { Config, AccessConfig } from './types.js';

// Zod schemas for validation
const ServerConfigSchema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
  base_path: z.string(),
  tls: z.object({
    enabled: z.boolean(),
  }),
});

const OpenAPIConfigSchema = z.object({
  title: z.string(),
  description: z.string(),
  servers: z.array(
    z.object({
      url: z.string(),
      description: z.string(),
    })
  ),
});

const SheetHeaderConfigSchema = z.object({
  mode: z.enum(['single', 'multi', 'legend', 'none']),
  identifier_row: z.number().optional(),
  type_row: z.number().optional(),
  description_row: z.number().optional(),
  legend_sheet: z.string().optional(),
});

const WorkbookConfigSchema = z.object({
  base_dir: z.string(),
  registry: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      readonly: z.boolean(),
      sheets: z.record(SheetHeaderConfigSchema).optional(),
    })
  ),
});

const QueueConfigSchema = z.object({
  batch_max_size: z.number().int().positive(),
  batch_debounce_ms: z.number().int().nonnegative(),
  lock_timeout_ms: z.number().int().positive(),
  lock_dir: z.string(),
});

const CacheConfigSchema = z.object({
  enabled: z.boolean(),
  invalidation: z.string(),
  poll_interval_ms: z.number().int().positive(),
});

const AuthConfigSchema = z.object({
  mode: z.enum(['none', 'jwt', 'static', 'both']),
  jwt: z.object({
    issuer: z.string(),
    expiration_minutes: z.number().int().positive(),
    algorithm: z.string(),
  }),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
  format: z.enum(['json', 'text']),
  file: z.object({
    enabled: z.boolean(),
    path: z.string(),
    max_files: z.number().int().positive().optional(),
  }).optional(),
});

const ConfigSchema = z.object({
  server: ServerConfigSchema,
  openapi: OpenAPIConfigSchema,
  workbooks: WorkbookConfigSchema,
  queue: QueueConfigSchema,
  cache: CacheConfigSchema,
  auth: AuthConfigSchema,
  logging: LoggingConfigSchema,
  profiles: z.record(z.lazy(() => z.object({
    server: ServerConfigSchema.partial().optional(),
    openapi: OpenAPIConfigSchema.partial().optional(),
    workbooks: WorkbookConfigSchema.partial().optional(),
    queue: QueueConfigSchema.partial().optional(),
    cache: CacheConfigSchema.partial().optional(),
    auth: AuthConfigSchema.partial().optional(),
    logging: LoggingConfigSchema.partial().optional(),
  }))).optional(),
});

const AccessConfigSchema = z.object({
  jwt: z.object({
    secret: z.string().min(32),
  }),
  oauth2: z.object({
    clients: z.array(
      z.object({
        client_id: z.string(),
        client_secret: z.string(),
        grant_types: z.array(z.string()),
        scopes: z.array(z.string()),
      })
    ),
    users: z.array(
      z.object({
        username: z.string(),
        password_hash: z.string(),
        scopes: z.array(z.string()),
      })
    ),
  }),
  tokens: z.object({
    static: z.array(
      z.object({
        token: z.string(),
        name: z.string(),
        scopes: z.array(z.string()),
      })
    ),
  }),
  acl: z.object({
    rules: z.array(
      z.object({
        scope: z.string(),
        allow: z.array(z.string()),
        admin_endpoints: z.boolean().optional(),
      })
    ),
  }),
});

function interpolateVariables(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Replace ${VAR_NAME} with environment variable value
    return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        throw new Error(`Environment variable ${varName} not found for interpolation`);
      }
      return envValue;
    });
  } else if (Array.isArray(obj)) {
    return obj.map(item => interpolateVariables(item));
  } else if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = interpolateVariables((obj as Record<string, unknown>)[key]);
    }
    return result;
  }
  return obj;
}

export function loadConfig(configPath?: string): Config {
  const configFilePath = configPath ?? process.env.CONFIG_PATH ?? '/etc/excel-api/config.yaml';

  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Config file not found: ${configFilePath}`);
  }

  const configFile = fs.readFileSync(configFilePath, 'utf8');
  let configData = yaml.parse(configFile);

  // Apply variable interpolation
  configData = interpolateVariables(configData);

  try {
    const parsedConfig = ConfigSchema.parse(configData);

    // Apply profile if CONFIG_PROFILE environment variable is set
    const profileName = process.env.CONFIG_PROFILE;
    if (profileName && parsedConfig.profiles && profileName in parsedConfig.profiles) {
      const profile = parsedConfig.profiles[profileName];
      // Deep merge profile with base config
      const mergedConfig = {
        ...parsedConfig,
        server: { ...parsedConfig.server, ...profile.server },
        openapi: { ...parsedConfig.openapi, ...profile.openapi },
        workbooks: { ...parsedConfig.workbooks, ...profile.workbooks },
        queue: { ...parsedConfig.queue, ...profile.queue },
        cache: { ...parsedConfig.cache, ...profile.cache },
        auth: { ...parsedConfig.auth, ...profile.auth },
        logging: { ...parsedConfig.logging, ...profile.logging },
      };
      // Remove profiles from merged config
      const { profiles, ...finalConfig } = mergedConfig;
      return finalConfig as Config;
    }

    // Remove profiles from config if no profile selected
    const { profiles, ...finalConfig } = parsedConfig;
    return finalConfig as Config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Config validation failed: ${error.message}`);
    }
    throw error;
  }
}

export function loadAccessConfig(accessPath?: string): AccessConfig {
  const accessFilePath = accessPath ?? process.env.ACCESS_PATH ?? '/etc/excel-api/access.yaml';

  if (!fs.existsSync(accessFilePath)) {
    throw new Error(`Access file not found: ${accessFilePath}`);
  }

  // Check file permissions (should be 0600)
  const stats = fs.statSync(accessFilePath);
  const mode = stats.mode & 0o777;
  if (mode !== 0o600) {
    console.warn(`WARNING: access.yaml has insecure permissions: ${mode.toString(8)} (should be 600)`);
  }

  const accessFile = fs.readFileSync(accessFilePath, 'utf8');
  let accessData = yaml.parse(accessFile);

  // Apply variable interpolation
  accessData = interpolateVariables(accessData);

  try {
    return AccessConfigSchema.parse(accessData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Access config validation failed: ${error.message}`);
    }
    throw error;
  }
}
