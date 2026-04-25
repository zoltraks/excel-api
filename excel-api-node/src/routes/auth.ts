import type { FastifyInstance, FastifyReply } from 'fastify';
import type { OAuth2Handler } from '../auth/jwt.js';
import { metrics } from '../metrics/collector.js';

export function authRoutes(oauth2Handler: OAuth2Handler) {
  return async function (server: FastifyInstance): Promise<void> {
    server.post<{
      Body: {
        grant_type: 'client_credentials' | 'password';
        client_id?: string;
        client_secret?: string;
        username?: string;
        password?: string;
      };
    }>(
      '/auth/token',
      async (request, reply: FastifyReply) => {
        metrics.incrementCounter('excel_api_auth_token_requests_total');
        const startTime = Date.now();

        try {
          let tokenResponse;

          if (request.body.grant_type === 'client_credentials') {
            if (!request.body.client_id || !request.body.client_secret) {
              return reply.status(400).send({
                error: 'invalid_request',
                error_description: 'client_id and client_secret are required',
              });
            }
            tokenResponse = await oauth2Handler.handleClientCredentialsGrant(
              request.body.client_id,
              request.body.client_secret
            );
          } else if (request.body.grant_type === 'password') {
            if (!request.body.username || !request.body.password) {
              return reply.status(400).send({
                error: 'invalid_request',
                error_description: 'username and password are required',
              });
            }
            tokenResponse = await oauth2Handler.handlePasswordGrant(
              request.body.username,
              request.body.password
            );
          } else {
            return reply.status(400).send({
              error: 'unsupported_grant_type',
              error_description: 'Only client_credentials and password grants are supported',
            });
          }

          metrics.observeHistogram('excel_api_auth_token_duration_ms', Date.now() - startTime);
          return tokenResponse;
        } catch (error) {
          metrics.incrementCounter('excel_api_errors_total', 1, { error: 'AUTH_FAILED' });
          return reply.status(401).send({
            error: 'invalid_client',
            error_description: error instanceof Error ? error.message : 'Authentication failed',
          });
        }
      }
    );
  };
}
