// Configuration loader with validation

import * as fs from 'fs';
import * as path from 'path';
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

const RegistryConfigSchema = z.object({
  directory: z.string(),
  workbooks: z.array(
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
  registry: RegistryConfigSchema,
  queue: QueueConfigSchema,
  cache: CacheConfigSchema,
  auth: AuthConfigSchema,
  logging: LoggingConfigSchema,
  profiles: z.record(z.lazy(() => z.object({
    server: ServerConfigSchema.partial().optional(),
    openapi: OpenAPIConfigSchema.partial().optional(),
    registry: RegistryConfigSchema.partial().optional(),
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

function resolveConfigPath(options: {
  workDir?: string;
  configPath?: string;
  accessPath?: string;
  isAccess?: boolean;
}): string {
  const { workDir, configPath, accessPath, isAccess = false } = options;

  const targetPath = isAccess ? accessPath : configPath;
  const defaultFileName = isAccess ? 'access.yaml' : 'config.yaml';

  // Step 1: If --config/--access parameter or CONFIG/ACCESS env var is specified
  if (targetPath) {
    if (workDir && !path.isAbsolute(targetPath)) {
      return path.join(workDir, targetPath);
    }
    return targetPath;
  }

  // Step 2: If --work parameter or WORK env var is specified
  if (workDir) {
    return path.join(workDir, 'config', defaultFileName);
  }

  // Step 3: Use default path from current working directory
  return path.join('config', defaultFileName);
}

function resolveRelativePath(configPath: string, workDir?: string): string {
  if (path.isAbsolute(configPath)) {
    return configPath;
  }
  const baseDir = workDir ?? process.cwd();
  return path.join(baseDir, configPath);
}

export function loadConfig(options?: {
  workDir?: string;
  configPath?: string;
}): Config {
  const workDir = options?.workDir ?? process.env.WORK;
  const configPath = options?.configPath ?? process.env.CONFIG;

  const resolveOptions: {
    workDir?: string;
    configPath?: string;
    accessPath?: string;
    isAccess: boolean;
  } = { isAccess: false };

  if (workDir) resolveOptions.workDir = workDir;
  if (configPath) resolveOptions.configPath = configPath;

  const configFilePath = resolveConfigPath(resolveOptions);

  if (!fs.existsSync(configFilePath)) {
    throw new Error(`Config file not found: ${configFilePath}`);
  }

  const configFile = fs.readFileSync(configFilePath, 'utf8');
  let configData = yaml.parse(configFile);

  // Apply variable interpolation
  configData = interpolateVariables(configData);

  try {
    const parsedConfig = ConfigSchema.parse(configData);

    // Resolve relative paths
    const resolvedConfig = {
      ...parsedConfig,
      registry: {
        ...parsedConfig.registry,
        directory: resolveRelativePath(parsedConfig.registry.directory, workDir),
      },
      queue: {
        ...parsedConfig.queue,
        lock_dir: resolveRelativePath(parsedConfig.queue.lock_dir, workDir),
      },
      logging: parsedConfig.logging.file
        ? {
            ...parsedConfig.logging,
            file: {
              ...parsedConfig.logging.file,
              path: resolveRelativePath(parsedConfig.logging.file.path, workDir),
            },
          }
        : parsedConfig.logging,
    };

    // Apply profile if CONFIG_PROFILE environment variable is set
    const profileName = process.env.CONFIG_PROFILE;
    if (profileName && resolvedConfig.profiles && profileName in resolvedConfig.profiles) {
      const profile = resolvedConfig.profiles[profileName];
      // Deep merge profile with base config
      const mergedConfig = {
        ...resolvedConfig,
        server: { ...resolvedConfig.server, ...profile.server },
        openapi: { ...resolvedConfig.openapi, ...profile.openapi },
        registry: { ...resolvedConfig.registry, ...profile.registry },
        queue: { ...resolvedConfig.queue, ...profile.queue },
        cache: { ...resolvedConfig.cache, ...profile.cache },
        auth: { ...resolvedConfig.auth, ...profile.auth },
        logging: { ...resolvedConfig.logging, ...profile.logging },
      };
      // Remove profiles from merged config
      const { profiles, ...finalConfig } = mergedConfig;
      return finalConfig as Config;
    }

    // Remove profiles from config if no profile selected
    const { profiles, ...finalConfig } = resolvedConfig;
    return finalConfig as Config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Config validation failed: ${error.message}`);
    }
    throw error;
  }
}

export function loadAccessConfig(options?: {
  workDir?: string;
  accessPath?: string;
  logger?: {
    warn: (message: string, additional?: Record<string, unknown>) => void;
  };
}): AccessConfig {
  const workDir = options?.workDir ?? process.env.WORK;
  const accessPath = options?.accessPath ?? process.env.ACCESS;
  const logger = options?.logger;

  const resolveOptions: {
    workDir?: string;
    configPath?: string;
    accessPath?: string;
    isAccess: boolean;
  } = { isAccess: true };

  if (workDir) resolveOptions.workDir = workDir;
  if (accessPath) resolveOptions.accessPath = accessPath;

  const accessFilePath = resolveConfigPath(resolveOptions);

  if (!fs.existsSync(accessFilePath)) {
    throw new Error(`Access file not found: ${accessFilePath}`);
  }

  // Check file permissions (should be 0600)
  const stats = fs.statSync(accessFilePath);
  const mode = stats.mode & 0o777;
  if (mode !== 0o600) {
    const message = `access.yaml has insecure permissions: ${mode.toString(8)} (should be 600)`;
    if (logger) {
      logger.warn(message);
    } else {
      console.warn(`WARNING: ${message}`);
    }
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
