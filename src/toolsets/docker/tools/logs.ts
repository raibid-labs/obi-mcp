/**
 * Docker Logs Tool
 * Fetch and stream OBI Docker container logs
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { dockerClient } from '../docker-client.js';
import logger from '../../../utils/logger.js';

/**
 * Tool definition for MCP
 */
export const dockerLogsTool: Tool = {
  name: 'obi_docker_logs',
  description:
    'Fetch logs from the OBI Docker container. ' +
    'Supports filtering by log level, time range, and number of lines. ' +
    'Can optionally follow logs in real-time.',
  inputSchema: {
    type: 'object',
    properties: {
      lines: {
        type: 'number',
        description: 'Number of log lines to retrieve from the end',
        default: 100,
      },
      follow: {
        type: 'boolean',
        description: 'Follow log output in real-time (stream mode)',
        default: false,
      },
      since: {
        type: 'string',
        description: 'Show logs since timestamp (e.g., "10m", "1h", "2d")',
      },
      level: {
        type: 'string',
        description: 'Filter logs by level',
        enum: ['info', 'warn', 'error'],
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DockerLogsArgsSchema = z.object({
  lines: z.number().optional().default(100),
  follow: z.boolean().optional().default(false),
  since: z.string().optional(),
  level: z.enum(['info', 'warn', 'error']).optional(),
});

export type DockerLogsArgs = z.infer<typeof DockerLogsArgsSchema>;

/**
 * Tool handler implementation
 */
export async function handleDockerLogs(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DockerLogsArgsSchema.parse(args);

    logger.info('Fetching OBI Docker container logs', validatedArgs);

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

    // Get container logs
    const logs = await dockerClient.getLogs({
      lines: validatedArgs.lines,
      follow: validatedArgs.follow,
      since: validatedArgs.since,
      level: validatedArgs.level,
    });

    const response = formatLogsResponse(logs, validatedArgs);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    logger.error('Error fetching OBI Docker logs', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error fetching container logs: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format logs response
 */
function formatLogsResponse(logs: string, config: DockerLogsArgs): string {
  const lines: string[] = [];

  lines.push('=== OBI Docker Container Logs ===\n');

  // Add filter information
  const filters: string[] = [];
  if (config.lines) {
    filters.push(`Last ${config.lines} lines`);
  }
  if (config.since) {
    filters.push(`Since ${config.since} ago`);
  }
  if (config.level) {
    filters.push(`Level: ${config.level}`);
  }

  if (filters.length > 0) {
    lines.push(`Filters: ${filters.join(' | ')}\n`);
  }

  // Add log content
  if (logs && logs.trim().length > 0) {
    lines.push('--- Log Output ---\n');
    lines.push(logs);
  } else {
    lines.push('No logs available.');
    lines.push('\nPossible reasons:');
    lines.push('- Container has just started');
    lines.push('- No logs match the specified filters');
    lines.push('- Container is not running');
  }

  if (config.follow) {
    lines.push('\n--- Follow Mode ---');
    lines.push('Note: Real-time log streaming is not supported in this context.');
    lines.push('Use `docker logs -f obi` to follow logs in your terminal.');
  }

  return lines.join('\n');
}
