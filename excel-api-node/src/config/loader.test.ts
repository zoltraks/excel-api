// Configuration loader unit tests

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, loadAccessConfig } from './loader.js';

describe('Configuration Loader', () => {
  const tempDir = '/tmp/excel-api-test';
  const configPath = path.join(tempDir, 'config.yaml');
  const accessPath = path.join(tempDir, 'access.yaml');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadConfig', () => {
    it('should load a valid configuration file', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks:
    - id: sample
      path: sample.xlsx
      readonly: false
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
`;
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig({ configPath });

      expect(config).toBeDefined();
      expect(config.server.port).toBe(8443);
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.server.base_path).toBe('/api/v1');
      expect(config.server.tls.enabled).toBe(false);
      expect(config.registry.workbooks).toHaveLength(1);
      expect(config.registry.workbooks[0].id).toBe('sample');
    });

    it('should throw error if config file does not exist', () => {
      expect(() => loadConfig({ configPath: '/nonexistent/config.yaml' })).toThrow('Config file not found');
    });

    it('should throw error on invalid configuration', () => {
      const invalidConfig = `
server:
  port: -1
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
`;
      fs.writeFileSync(configPath, invalidConfig);

      expect(() => loadConfig({ configPath })).toThrow('Config validation failed');
    });

    it('should use CONFIG environment variable when no path provided', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
`;
      fs.writeFileSync(configPath, configContent);
      process.env.CONFIG = configPath;

      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.server.port).toBe(8443);

      delete process.env.CONFIG;
    });

    it('should resolve lifecycle from config file', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
lifecycle:
  life: 30s
`;
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig({ configPath });

      expect(config.lifecycle?.life).toBe('30s');
    });

    it('should override lifecycle with environment variable', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
lifecycle:
  life: 30s
`;
      fs.writeFileSync(configPath, configContent);
      process.env.LIFE = '60s';

      const config = loadConfig({ configPath });

      expect(config.lifecycle?.life).toBe('60s');

      delete process.env.LIFE;
    });

    it('should override lifecycle with CLI argument', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
lifecycle:
  life: 30s
`;
      fs.writeFileSync(configPath, configContent);
      process.env.LIFE = '60s';

      const config = loadConfig({ configPath, cliLife: '90s' });

      expect(config.lifecycle?.life).toBe('90s');

      delete process.env.LIFE;
    });

    it('should not set lifecycle if none provided', () => {
      const configContent = `
server:
  port: 8443
  host: 0.0.0.0
  base_path: /api/v1
  tls:
    enabled: false
openapi:
  title: Excel API
  description: API for Excel file operations
  servers:
    - url: http://localhost:8443/api/v1
      description: Local server
registry:
  directory: /data/workbooks
  workbooks: []
queue:
  batch_max_size: 100
  batch_debounce_ms: 100
  lock_timeout_ms: 5000
  lock_dir: /tmp/excel-api/locks
cache:
  enabled: true
  invalidation: mtime
  poll_interval_ms: 1000
auth:
  mode: jwt
  jwt:
    issuer: excel-api
    expiration_minutes: 60
    algorithm: HS256
logging:
  level: info
  format: json
`;
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig({ configPath });

      expect(config.lifecycle).toBeUndefined();
    });
  });

  describe('loadAccessConfig', () => {
    it('should load a valid access configuration file', () => {
      const accessContent = `
jwt:
  secret: 0123456789abcdef0123456789abcdef
oauth2:
  clients:
    - client_id: test-client
      client_secret: test-secret
      grant_types:
        - client_credentials
        - password
      scopes:
        - read
  users:
    - username: test-user
      password_hash: $2b$10$abcdefghijklmnopqrstuvwxyz
      scopes:
        - read
tokens:
  static:
    - token: static-token-123
      name: Test Static Token
      scopes:
        - read
acl:
  rules:
    - scope: read
      allow:
        - GET /workbooks
        - GET /cells
`;
      fs.writeFileSync(accessPath, accessContent);
      fs.chmodSync(accessPath, 0o600);

      const accessConfig = loadAccessConfig({ accessPath });

      expect(accessConfig).toBeDefined();
      expect(accessConfig.jwt.secret).toBe('0123456789abcdef0123456789abcdef');
      expect(accessConfig.oauth2.clients).toHaveLength(1);
      expect(accessConfig.tokens.static).toHaveLength(1);
      expect(accessConfig.acl.rules).toHaveLength(1);
    });

    it('should throw error if access file does not exist', () => {
      expect(() => loadAccessConfig({ accessPath: '/nonexistent/access.yaml' })).toThrow('Access file not found');
    });

    it('should warn on insecure file permissions', () => {
      const accessContent = `
jwt:
  secret: 0123456789abcdef0123456789abcdef
oauth2:
  clients: []
  users: []
tokens:
  static: []
acl:
  rules: []
`;
      fs.writeFileSync(accessPath, accessContent);
      fs.chmodSync(accessPath, 0o644);

      // Should not throw, just warn
      expect(() => loadAccessConfig({ accessPath })).not.toThrow();
    });

    it('should throw error on invalid access configuration', () => {
      const invalidAccess = `
jwt:
  secret: short
oauth2:
  clients: []
  users: []
tokens:
  static: []
acl:
  rules: []
`;
      fs.writeFileSync(accessPath, invalidAccess);

      expect(() => loadAccessConfig({ accessPath })).toThrow('Access config validation failed');
    });

    it('should use ACCESS environment variable when no path provided', () => {
      const accessContent = `
jwt:
  secret: 0123456789abcdef0123456789abcdef
oauth2:
  clients: []
  users: []
tokens:
  static: []
acl:
  rules: []
`;
      fs.writeFileSync(accessPath, accessContent);
      fs.chmodSync(accessPath, 0o600);
      process.env.ACCESS = accessPath;

      const accessConfig = loadAccessConfig();

      expect(accessConfig).toBeDefined();
      expect(accessConfig.jwt.secret).toBe('0123456789abcdef0123456789abcdef');

      delete process.env.ACCESS;
    });
  });
});
