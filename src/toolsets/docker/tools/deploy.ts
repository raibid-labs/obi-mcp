/**
 * Docker Deploy Tool
 * Deploys OBI as a Docker container
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { dockerClient } from '../docker-client.js';
import logger from '../../../utils/logger.js';

/**
 * Tool definition for MCP
 */
export const dockerDeployTool: Tool = {
  name: 'obi_docker_deploy',
  description:
    'Deploy OpenTelemetry eBPF Instrumentation (OBI) as a Docker container. ' +
    'Supports standalone and Docker Compose modes with configurable networking, ' +
    'resource limits, and OTLP endpoint configuration.',
  inputSchema: {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        description: 'OBI configuration object (optional)',
      },
      configPath: {
        type: 'string',
        description: 'Path to OBI configuration file (optional)',
      },
      targetPort: {
        type: 'number',
        description: 'Target port to monitor (default: 8080)',
        default: 8080,
      },
      network: {
        type: 'string',
        description: 'Docker network mode (host, bridge, or custom network name)',
        default: 'host',
        enum: ['host', 'bridge', 'none'],
      },
      mode: {
        type: 'string',
        description: 'Deployment mode',
        enum: ['standalone', 'compose'],
        default: 'standalone',
      },
      otlpEndpoint: {
        type: 'string',
        description: 'OTLP endpoint for exporting telemetry data',
        default: 'http://localhost:4317',
      },
      resources: {
        type: 'object',
        description: 'Resource limits for the container',
        properties: {
          cpus: {
            type: 'string',
            description: 'CPU limit (e.g., "1.5" for 1.5 CPUs)',
          },
          memory: {
            type: 'string',
            description: 'Memory limit (e.g., "512m" for 512 MB)',
          },
        },
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DockerDeployArgsSchema = z.object({
  config: z.record(z.unknown()).optional(),
  configPath: z.string().optional(),
  targetPort: z.number().optional().default(8080),
  network: z.enum(['host', 'bridge', 'none']).optional().default('host'),
  mode: z.enum(['standalone', 'compose']).optional().default('standalone'),
  otlpEndpoint: z.string().optional().default('http://localhost:4317'),
  resources: z
    .object({
      cpus: z.string().optional(),
      memory: z.string().optional(),
    })
    .optional(),
});

export type DockerDeployArgs = z.infer<typeof DockerDeployArgsSchema>;

/**
 * Tool handler implementation
 */
export async function handleDockerDeploy(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DockerDeployArgsSchema.parse(args);

    logger.info('Deploying OBI in Docker', validatedArgs);

    // Check Docker availability
    const isDockerAvailable = await dockerClient.ping();
    if (!isDockerAvailable) {
      return {
        content: [
          {
            type: 'text',
            text:
              'Error: Docker is not available or not running.\n\n' +
              'Please ensure Docker is installed and running:\n' +
              '- Docker Desktop: Check if the application is running\n' +
              '- Docker Engine: Run `sudo systemctl status docker`\n' +
              '- Permissions: Ensure your user has access to Docker socket',
          },
        ],
        isError: true,
      };
    }

    // Deploy container
    const containerId = await dockerClient.deployOBI({
      config: validatedArgs.config,
      configPath: validatedArgs.configPath,
      targetPort: validatedArgs.targetPort,
      network: validatedArgs.network,
      mode: validatedArgs.mode,
      otlpEndpoint: validatedArgs.otlpEndpoint,
      resources: validatedArgs.resources,
    });

    // Get initial status
    const status = await dockerClient.getStatus();

    const response = formatDeployResponse(containerId, status, validatedArgs);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    logger.error('Error deploying OBI in Docker', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error deploying OBI: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format deployment response
 */
function formatDeployResponse(
  containerId: string,
  status: any,
  config: DockerDeployArgs
): string {
  const lines: string[] = [];

  lines.push('=== OBI Docker Deployment ===\n');
  lines.push('Status: Successfully deployed');
  lines.push(`Container ID: ${containerId}`);
  lines.push(`Container Name: ${status.name}`);
  lines.push(`Running: ${status.running ? 'Yes' : 'No'}`);
  lines.push(`Network Mode: ${config.network}`);

  if (config.targetPort) {
    lines.push(`Target Port: ${config.targetPort}`);
  }

  if (config.otlpEndpoint) {
    lines.push(`OTLP Endpoint: ${config.otlpEndpoint}`);
  }

  if (config.resources) {
    lines.push('\n--- Resource Limits ---');
    if (config.resources.cpus) {
      lines.push(`CPUs: ${config.resources.cpus}`);
    }
    if (config.resources.memory) {
      lines.push(`Memory: ${config.resources.memory}`);
    }
  }

  lines.push('\n--- Next Steps ---');
  lines.push('1. Check status: Use `obi_docker_status` tool');
  lines.push('2. View logs: Use `obi_docker_logs` tool');
  lines.push('3. Monitor: Check container metrics and health');

  lines.push('\n--- Management Commands ---');
  lines.push('View logs: docker logs obi');
  lines.push('Stop container: docker stop obi');
  lines.push('Restart: docker restart obi');

  return lines.join('\n');
}
