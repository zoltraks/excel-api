// Configuration type definitions

export interface ServerConfig {
  port: number;
  host: string;
  base_path: string;
  tls: {
    enabled: boolean;
  };
}

export interface OpenAPIConfig {
  title: string;
  description: string;
  servers: Array<{
    url: string;
    description: string;
  }>;
}

export interface SheetHeaderConfig {
  mode: 'single' | 'multi' | 'legend' | 'none';
  identifier_row?: number;
  type_row?: number;
  description_row?: number;
  legend_sheet?: string;
}

export interface RegistryConfig {
  directory: string;
  workbooks: Array<{
    id: string;
    path: string;
    readonly: boolean;
    sheets?: Record<string, SheetHeaderConfig>;
  }>;
}

export interface QueueConfig {
  batch_max_size: number;
  batch_debounce_ms: number;
  lock_timeout_ms: number;
  lock_dir: string;
}

export interface CacheConfig {
  enabled: boolean;
  invalidation: string;
  poll_interval_ms: number;
}

export interface AuthConfig {
  mode: string;
  jwt: {
    issuer: string;
    expiration_minutes: number;
    algorithm: string;
  };
}

export interface LoggingConfig {
  level: string;
  format: string;
  file: {
    enabled: boolean;
    path: string;
    max_files?: number;
  };
}

export interface LifecycleConfig {
  life?: string;
}

export interface Config {
  server: ServerConfig;
  openapi: OpenAPIConfig;
  registry: RegistryConfig;
  queue: QueueConfig;
  cache: CacheConfig;
  auth: AuthConfig;
  logging: LoggingConfig;
  lifecycle?: LifecycleConfig;
  profiles?: Record<string, Partial<Config>>;
}

export interface AccessConfig {
  jwt: {
    secret: string;
  };
  oauth2: {
    clients: Array<{
      client_id: string;
      client_secret: string;
      grant_types: string[];
      scopes: string[];
    }>;
    users: Array<{
      username: string;
      password_hash: string;
      scopes: string[];
    }>;
  };
  tokens: {
    static: Array<{
      token: string;
      name: string;
      scopes: string[];
    }>;
  };
  acl: {
    rules: Array<{
      scope: string;
      allow: string[];
      admin_endpoints?: boolean | undefined;
    }>;
  };
}
