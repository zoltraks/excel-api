import type { FastifyInstance, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as yaml from 'yaml';
import type { Config } from '../config/types.js';

export function openapiRoutes(config: Config) {
  return async function (server: FastifyInstance): Promise<void> {
    server.get('/openapi.yaml', async (_request, reply: FastifyReply) => {
      const openapiPath = './resources/openapi.yaml';
      const openapiContent = fs.readFileSync(openapiPath, 'utf8');
      const openapiDoc = yaml.parse(openapiContent);

      openapiDoc.servers[0].url = `${config.server.tls.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}${config.server.base_path}`;
      openapiDoc.info.version = '0.0.2';
      openapiDoc.info.title = 'Excel API (excel-api-node)';

      reply.type('application/yaml');
      return yaml.stringify(openapiDoc);
    });

    server.get('/openapi.json', async (_request) => {
      const openapiPath = './resources/openapi.yaml';
      const openapiContent = fs.readFileSync(openapiPath, 'utf8');
      const openapiDoc = yaml.parse(openapiContent);

      openapiDoc.servers[0].url = `${config.server.tls.enabled ? 'https' : 'http'}://${config.server.host}:${config.server.port}${config.server.base_path}`;
      openapiDoc.info.version = '0.0.2';
      openapiDoc.info.title = 'Excel API (excel-api-node)';

      return openapiDoc;
    });
  };
}
