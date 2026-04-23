// ACL checker unit tests

import { describe, it, expect } from 'vitest';
import { ACLChecker } from './acl.js';
import type { AccessConfig } from '../config/types.js';

describe('ACL Checker', () => {
  const accessConfig: AccessConfig = {
    jwt: {
      secret: 'test-secret-key-for-testing',
    },
    oauth2: {
      clients: [],
      users: [],
    },
    tokens: {
      static: [],
    },
    acl: {
      rules: [
        {
          scope: 'read',
          allow: ['GET', 'HEAD'],
          admin_endpoints: false,
        },
        {
          scope: 'write',
          allow: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
          admin_endpoints: false,
        },
        {
          scope: 'admin',
          allow: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
          admin_endpoints: true,
        },
      ],
    },
  };

  it('should check permission for allowed method', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('read', 'GET');
    expect(result).toBe(true);
  });

  it('should deny permission for disallowed method', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('read', 'POST');
    expect(result).toBe(false);
  });

  it('should deny permission for unknown scope', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('unknown', 'GET');
    expect(result).toBe(false);
  });

  it('should allow admin scope for admin endpoints', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('admin', 'GET', true);
    expect(result).toBe(true);
  });

  it('should deny non-admin scope for admin endpoints', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('read', 'GET', true);
    expect(result).toBe(false);
  });

  it('should allow non-admin scope for regular endpoints', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('read', 'GET', false);
    expect(result).toBe(true);
  });

  it('should allow write scope for POST method', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('write', 'POST');
    expect(result).toBe(true);
  });

  it('should allow write scope for DELETE method', () => {
    const checker = new ACLChecker(accessConfig);
    const result = checker.checkPermission('write', 'DELETE');
    expect(result).toBe(true);
  });

  it('should get required scope for method', () => {
    const checker = new ACLChecker(accessConfig);
    const scope = checker.getRequiredScope('GET');
    expect(scope).toBe('read');
  });

  it('should get write scope for POST method', () => {
    const checker = new ACLChecker(accessConfig);
    const scope = checker.getRequiredScope('POST');
    expect(scope).toBe('write');
  });

  it('should return null for method not in any scope', () => {
    const checker = new ACLChecker(accessConfig);
    const scope = checker.getRequiredScope('PATCH');
    expect(scope).toBeNull();
  });

  it('should get admin scope for admin endpoints', () => {
    const checker = new ACLChecker(accessConfig);
    const scope = checker.getRequiredScope('DELETE');
    expect(scope).toBe('write');
  });

  it('should handle empty allow list', () => {
    const configWithEmpty: AccessConfig = {
      ...accessConfig,
      acl: {
        rules: [
          {
            scope: 'empty',
            allow: [],
            admin_endpoints: false,
          },
        ],
      },
    };
    const checker = new ACLChecker(configWithEmpty);
    const result = checker.checkPermission('empty', 'GET');
    expect(result).toBe(false);
  });

  it('should handle missing admin_endpoints flag', () => {
    const configWithoutFlag: AccessConfig = {
      ...accessConfig,
      acl: {
        rules: [
          {
            scope: 'read',
            allow: ['GET'],
          },
        ],
      },
    };
    const checker = new ACLChecker(configWithoutFlag);
    const result = checker.checkPermission('read', 'GET', true);
    expect(result).toBe(false);
  });
});
