// Authentication middleware for Fastify

import type { FastifyRequest, FastifyReply } from 'fastify';
import { JWTAuth, StaticTokenAuth } from './jwt.js';
import { ACLChecker } from './acl.js';

export interface AuthContext {
  sub: string;
  scopes: string[];
}

export function createAuthMiddleware(
  jwtAuth: JWTAuth,
  staticTokenAuth: StaticTokenAuth
) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing Authorization header',
      });
      return;
    }

    let authContext: AuthContext | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = jwtAuth.verifyToken(token);
        authContext = {
          sub: payload.sub,
          scopes: payload.scope,
        };
      } catch (error) {
        reply.status(401).send({
          error: 'TOKEN_EXPIRED',
          message: 'Invalid or expired token',
        });
        return;
      }
    } else if (authHeader.startsWith('Token ')) {
      const token = authHeader.substring(6);
      const tokenData = staticTokenAuth.verifyToken(token);
      if (tokenData) {
        authContext = {
          sub: tokenData.name,
          scopes: tokenData.scopes,
        };
      } else {
        reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid static token',
        });
        return;
      }
    } else {
      reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid Authorization header format',
      });
      return;
    }

    request.auth = authContext;
  };
}

export function createScopeCheckMiddleware(
  aclChecker: ACLChecker,
  requiredScope: string,
  isAdminEndpoint: boolean = false
) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const authContext = request.auth as AuthContext | undefined;

    if (!authContext) {
      reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const hasRequiredScope = authContext.scopes.includes(requiredScope);
    if (!hasRequiredScope) {
      reply.status(403).send({
        error: 'FORBIDDEN',
        message: `Insufficient scope. Required: ${requiredScope}`,
      });
      return;
    }

    const method = request.method;
    const hasPermission = aclChecker.checkPermission(
      requiredScope,
      method,
      isAdminEndpoint
    );

    if (!hasPermission) {
      reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions for this operation',
      });
      return;
    }
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
