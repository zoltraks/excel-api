import type { FastifyInstance, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as yaml from 'yaml';
import type { Config } from '../config/types.js';

export function openapiRoutes(_config: Config) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get('/openapi.yaml', async (_request, reply: FastifyReply) => {
      const openapiPath = './resources/openapi.yaml';
      const openapiContent = fs.readFileSync(openapiPath, 'utf8');
      reply.type('application/yaml');
      return openapiContent;
    });

    server.get('/openapi.json', async (_request) => {
      const openapiPath = './resources/openapi.yaml';
      const openapiContent = fs.readFileSync(openapiPath, 'utf8');
      return yaml.parse(openapiContent);
    });
  };
}
