/**
 * Docker Stop Tool
 * Stop and remove OBI Docker container
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { dockerClient } from '../docker-client.js';
import logger from '../../../utils/logger.js';

/**
 * Tool definition for MCP
 */
export const dockerStopTool: Tool = {
  name: 'obi_docker_stop',
  description:
    'Stop and remove the OBI Docker container. ' +
    'Supports graceful shutdown with configurable timeout, or forced stop. ' +
    'Optionally removes associated volumes.',
  inputSchema: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force stop the container immediately (kill instead of stop)',
        default: false,
      },
      removeVolumes: {
        type: 'boolean',
        description: 'Remove associated volumes when stopping',
        default: false,
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DockerStopArgsSchema = z.object({
  force: z.boolean().optional().default(false),
  removeVolumes: z.boolean().optional().default(false),
});

export type DockerStopArgs = z.infer<typeof DockerStopArgsSchema>;

/**
 * Tool handler implementation
 */
export async function handleDockerStop(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DockerStopArgsSchema.parse(args);

    logger.info('Stopping OBI Docker container', validatedArgs);

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

    // Get status before stopping
    const statusBefore = await dockerClient.getStatus();

    if (!statusBefore.running && statusBefore.status === 'not found') {
      return {
        content: [
          {
            type: 'text',
            text:
              '=== OBI Docker Container ===\n\n' +
              'Container not found or already stopped.\n\n' +
              'No action needed.',
          },
        ],
      };
    }

    // Stop container
    await dockerClient.stop({
      force: validatedArgs.force,
      removeVolumes: validatedArgs.removeVolumes,
    });

    const response = formatStopResponse(statusBefore, validatedArgs);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    logger.error('Error stopping OBI Docker container', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error stopping container: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format stop response
 */
function formatStopResponse(status: any, config: DockerStopArgs): string {
  const lines: string[] = [];

  lines.push('=== OBI Docker Container Stopped ===\n');
  lines.push('Status: Successfully stopped and removed');
  lines.push(`Container ID: ${status.id}`);
  lines.push(`Container Name: ${status.name}`);

  if (status.startedAt) {
    const startTime = new Date(status.startedAt);
    const uptime = Date.now() - startTime.getTime();
    lines.push(`Was running for: ${formatUptime(uptime)}`);
  }

  lines.push('\n--- Stop Details ---');
  lines.push(`Method: ${config.force ? 'Force kill (immediate)' : 'Graceful stop (10s timeout)'}`);
  lines.push(`Volumes removed: ${config.removeVolumes ? 'Yes' : 'No'}`);

  lines.push('\n--- What was cleaned up ---');
  lines.push('✓ Container process stopped');
  lines.push('✓ Container removed from Docker');
  if (config.removeVolumes) {
    lines.push('✓ Associated volumes removed');
  } else {
    lines.push('• Volumes preserved (use removeVolumes: true to delete)');
  }

  lines.push('\n--- Next Steps ---');
  lines.push('To redeploy OBI, use the `obi_docker_deploy` tool');
  lines.push('To check remaining containers: docker ps -a');
  if (!config.removeVolumes) {
    lines.push('To clean up volumes: docker volume prune');
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
