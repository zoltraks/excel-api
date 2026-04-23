// Access Control List (ACL) checker

import type { AccessConfig } from '../config/types.js';

export class ACLChecker {
  private accessConfig: AccessConfig;

  constructor(accessConfig: AccessConfig) {
    this.accessConfig = accessConfig;
  }

  checkPermission(
    scope: string,
    method: string,
    isAdminEndpoint: boolean = false
  ): boolean {
    const rule = this.accessConfig.acl.rules.find((r) => r.scope === scope);

    if (!rule) {
      return false;
    }

    // Check if endpoint requires admin scope
    if (isAdminEndpoint && !rule.admin_endpoints) {
      return false;
    }

    return rule.allow.includes(method);
  }

  getRequiredScope(method: string): string | null {
    // Find the lowest-privilege scope that allows this method
    const rules = [...this.accessConfig.acl.rules].sort((a, b) => {
      // Priority: read < write < admin
      const priority = { read: 1, write: 2, admin: 3 };
      return priority[a.scope as keyof typeof priority] - priority[b.scope as keyof typeof priority];
    });

    for (const rule of rules) {
      if (rule.allow.includes(method)) {
        return rule.scope;
      }
    }

    return null;
  }
}
