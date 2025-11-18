/**
 * Docker MCP Resources
 * Provides Docker-specific resources for OBI
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { dockerClient } from '../docker-client.js';
import { composeGenerator } from '../compose-generator.js';
import logger from '../../../utils/logger.js';

/**
 * Docker resource URIs
 */
export const DOCKER_RESOURCE_URIS = {
  STATUS_CURRENT: 'obi-docker://status/current',
  LOGS_RECENT: 'obi-docker://logs/recent',
  COMPOSE_TEMPLATE: 'obi-docker://compose/template',
} as const;

/**
 * List all Docker resources
 */
export function listDockerResources(): Resource[] {
  return [
    {
      uri: DOCKER_RESOURCE_URIS.STATUS_CURRENT,
      name: 'Current Docker Container Status',
      description: 'Real-time status of the OBI Docker container including metrics',
      mimeType: 'application/json',
    },
    {
      uri: DOCKER_RESOURCE_URIS.LOGS_RECENT,
      name: 'Recent Docker Container Logs',
      description: 'Last 100 lines of OBI container logs',
      mimeType: 'text/plain',
    },
    {
      uri: DOCKER_RESOURCE_URIS.COMPOSE_TEMPLATE,
      name: 'Docker Compose Template',
      description: 'Default docker-compose.yml template for OBI deployment',
      mimeType: 'text/x-yaml',
    },
  ];
}

/**
 * Handle Docker resource reads
 */
export async function handleDockerResourceRead(uri: string): Promise<{
  contents: Array<{ uri: string; mimeType?: string; text: string }>;
}> {
  logger.info('Reading Docker resource', { uri });

  switch (uri) {
    case DOCKER_RESOURCE_URIS.STATUS_CURRENT:
      return await getStatusResource();

    case DOCKER_RESOURCE_URIS.LOGS_RECENT:
      return await getLogsResource();

    case DOCKER_RESOURCE_URIS.COMPOSE_TEMPLATE:
      return await getComposeTemplateResource();

    default:
      throw new Error(`Unknown Docker resource URI: ${uri}`);
  }
}

/**
 * Get current container status resource
 */
async function getStatusResource() {
  try {
    const status = await dockerClient.getStatus();

    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.STATUS_CURRENT,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to get status resource', { error });
    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.STATUS_CURRENT,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
              status: 'error',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}

/**
 * Get recent logs resource
 */
async function getLogsResource() {
  try {
    const logs = await dockerClient.getLogs({ lines: 100 });

    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.LOGS_RECENT,
          mimeType: 'text/plain',
          text: logs || 'No logs available',
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to get logs resource', { error });
    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.LOGS_RECENT,
          mimeType: 'text/plain',
          text: `Error fetching logs: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Get Docker Compose template resource
 */
async function getComposeTemplateResource() {
  try {
    const composeFile = composeGenerator.generateCompose({
      network: 'host',
      targetPort: 8080,
      includeCollector: false,
      otlpEndpoint: 'http://localhost:4317',
    });

    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.COMPOSE_TEMPLATE,
          mimeType: 'text/x-yaml',
          text: composeFile,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to generate compose template', { error });
    return {
      contents: [
        {
          uri: DOCKER_RESOURCE_URIS.COMPOSE_TEMPLATE,
          mimeType: 'text/plain',
          text: `Error generating template: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
