/**
 * Docker Status Tool
 * Get OBI Docker container status and metrics
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { dockerClient } from '../docker-client.js';
import logger from '../../../utils/logger.js';

/**
 * Tool definition for MCP
 */
export const dockerStatusTool: Tool = {
  name: 'obi_docker_status',
  description:
    'Get the current status of the OBI Docker container. ' +
    'Returns information about running status, resource usage, network configuration, ' +
    'and container health.',
  inputSchema: {
    type: 'object',
    properties: {
      verbose: {
        type: 'boolean',
        description: 'Include detailed container metrics and configuration',
        default: false,
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DockerStatusArgsSchema = z.object({
  verbose: z.boolean().optional().default(false),
});

export type DockerStatusArgs = z.infer<typeof DockerStatusArgsSchema>;

/**
 * Tool handler implementation
 */
export async function handleDockerStatus(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DockerStatusArgsSchema.parse(args);

    logger.info('Getting OBI Docker container status', validatedArgs);

    // Check Docker availability
    const isDockerAvailable = await dockerClient.ping();
    if (!isDockerAvailable) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: Docker is not available or not running.\n\n' +
              'Please ensure Docker is installed and running.',
          },
        ],
        isError: true,
      };
    }

    // Get container status
    const status = await dockerClient.getStatus();

    const response = formatStatusResponse(status, validatedArgs.verbose);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    logger.error('Error getting OBI Docker status', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error getting container status: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format status response
 */
function formatStatusResponse(status: any, verbose: boolean): string {
  const lines: string[] = [];

  lines.push('=== OBI Docker Container Status ===\n');

  if (!status.running && status.status === 'not found') {
    lines.push('Status: Container not found');
    lines.push('\nThe OBI container is not deployed.');
    lines.push('Use `obi_docker_deploy` to deploy OBI in Docker.');
    return lines.join('\n');
  }

  lines.push(`Container ID: ${status.id}`);
  lines.push(`Container Name: ${status.name}`);
  lines.push(`Status: ${status.status}`);
  lines.push(`Running: ${status.running ? 'Yes' : 'No'}`);

  if (status.startedAt) {
    const startTime = new Date(status.startedAt);
    const uptime = Date.now() - startTime.getTime();
    lines.push(`Started: ${startTime.toLocaleString()}`);
    lines.push(`Uptime: ${formatUptime(uptime)}`);
  }

  if (status.networks && status.networks.length > 0) {
    lines.push(`Networks: ${status.networks.join(', ')}`);
  }

  if (status.ports && Object.keys(status.ports).length > 0) {
    lines.push('\n--- Port Mappings ---');
    Object.entries(status.ports).forEach(([container, host]) => {
      lines.push(`${container} -> ${host}`);
    });
  }

  if (verbose && status.running) {
    lines.push('\n--- Resource Usage ---');

    if (status.cpuUsage !== undefined) {
      lines.push(`CPU Usage: ${status.cpuUsage.toFixed(2)}%`);
    }

    if (status.memoryUsage !== undefined) {
      const memUsageStr = `${status.memoryUsage.toFixed(2)} MB`;
      const memLimitStr = status.memoryLimit
        ? ` / ${status.memoryLimit.toFixed(2)} MB`
        : '';
      const memPercent =
        status.memoryLimit && status.memoryLimit > 0
          ? ` (${((status.memoryUsage / status.memoryLimit) * 100).toFixed(1)}%)`
          : '';
      lines.push(`Memory Usage: ${memUsageStr}${memLimitStr}${memPercent}`);
    }

    lines.push('\n--- Quick Commands ---');
    lines.push(`View logs: docker logs ${status.name}`);
    lines.push(`Inspect: docker inspect ${status.name}`);
    lines.push(`Stats: docker stats ${status.name}`);
  }

  if (!status.running) {
    lines.push('\n--- Container is not running ---');
    lines.push('Start the container with:');
    lines.push(`docker start ${status.name}`);
    lines.push('\nOr redeploy using `obi_docker_deploy`');
  }

  return lines.join('\n');
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
