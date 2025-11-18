/**
 * Docker Compose Tool
 * Generate docker-compose.yml for OBI deployment
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { composeGenerator } from '../compose-generator.js';
import logger from '../../../utils/logger.js';

/**
 * Tool definition for MCP
 */
export const dockerComposeTool: Tool = {
  name: 'obi_docker_compose',
  description:
    'Generate a docker-compose.yml file for deploying OBI. ' +
    'Optionally includes OpenTelemetry Collector service. ' +
    'Returns complete compose file content ready to use.',
  inputSchema: {
    type: 'object',
    properties: {
      network: {
        type: 'string',
        description: 'Docker network mode (host, bridge, or custom network)',
        default: 'host',
      },
      targetPort: {
        type: 'number',
        description: 'Target port to monitor',
        default: 8080,
      },
      includeCollector: {
        type: 'boolean',
        description: 'Include OpenTelemetry Collector service',
        default: false,
      },
      otlpEndpoint: {
        type: 'string',
        description: 'OTLP endpoint for exporting telemetry',
        default: 'http://localhost:4317',
      },
      exportEndpoint: {
        type: 'string',
        description: 'External endpoint for collector to export data to (optional)',
      },
      resources: {
        type: 'object',
        description: 'Resource limits for OBI container',
        properties: {
          cpus: {
            type: 'string',
            description: 'CPU limit (e.g., "1.5")',
          },
          memory: {
            type: 'string',
            description: 'Memory limit (e.g., "512m")',
          },
        },
      },
      volumes: {
        type: 'object',
        description: 'Volume mappings (host:container)',
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DockerComposeArgsSchema = z.object({
  network: z.string().optional().default('host'),
  targetPort: z.number().optional().default(8080),
  includeCollector: z.boolean().optional().default(false),
  otlpEndpoint: z.string().optional().default('http://localhost:4317'),
  exportEndpoint: z.string().optional(),
  resources: z
    .object({
      cpus: z.string().optional(),
      memory: z.string().optional(),
    })
    .optional(),
  volumes: z.record(z.string()).optional(),
});

export type DockerComposeArgs = z.infer<typeof DockerComposeArgsSchema>;

/**
 * Tool handler implementation
 */
export async function handleDockerCompose(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DockerComposeArgsSchema.parse(args);

    logger.info('Generating docker-compose.yml', validatedArgs);

    // Generate compose file and related files
    const deploymentPackage = composeGenerator.generateDeploymentPackage({
      network: validatedArgs.network,
      targetPort: validatedArgs.targetPort,
      includeCollector: validatedArgs.includeCollector,
      otlpEndpoint: validatedArgs.otlpEndpoint,
      exportEndpoint: validatedArgs.exportEndpoint,
      resources: validatedArgs.resources,
      volumes: validatedArgs.volumes,
    });

    const response = formatComposeResponse(deploymentPackage, validatedArgs);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  } catch (error) {
    logger.error('Error generating docker-compose.yml', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error generating compose file: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format compose response
 */
function formatComposeResponse(
  pkg: { composeFile: string; collectorConfig?: string; readme: string },
  config: DockerComposeArgs
): string {
  const lines: string[] = [];

  lines.push('=== OBI Docker Compose Configuration ===\n');

  // Configuration summary
  lines.push('--- Configuration Summary ---');
  lines.push(`Network Mode: ${config.network}`);
  lines.push(`Target Port: ${config.targetPort}`);
  lines.push(`OTLP Endpoint: ${config.otlpEndpoint}`);
  lines.push(`Include Collector: ${config.includeCollector ? 'Yes' : 'No'}`);

  if (config.resources) {
    lines.push('\nResource Limits:');
    if (config.resources.cpus) {
      lines.push(`  CPUs: ${config.resources.cpus}`);
    }
    if (config.resources.memory) {
      lines.push(`  Memory: ${config.resources.memory}`);
    }
  }

  // docker-compose.yml content
  lines.push('\n' + '='.repeat(50));
  lines.push('FILE: docker-compose.yml');
  lines.push('='.repeat(50) + '\n');
  lines.push(pkg.composeFile);

  // Collector config if included
  if (pkg.collectorConfig) {
    lines.push('\n' + '='.repeat(50));
    lines.push('FILE: otel-config.yaml');
    lines.push('='.repeat(50) + '\n');
    lines.push(pkg.collectorConfig);
  }

  // README
  lines.push('\n' + '='.repeat(50));
  lines.push('FILE: README.md');
  lines.push('='.repeat(50) + '\n');
  lines.push(pkg.readme);

  // Usage instructions
  lines.push('\n' + '='.repeat(50));
  lines.push('USAGE INSTRUCTIONS');
  lines.push('='.repeat(50) + '\n');

  lines.push('1. Save the files:');
  lines.push('   - Copy docker-compose.yml content to a file');
  if (pkg.collectorConfig) {
    lines.push('   - Copy otel-config.yaml content to a file (same directory)');
  }
  lines.push('   - Optionally save README.md for reference\n');

  lines.push('2. Deploy the stack:');
  lines.push('   docker-compose up -d\n');

  lines.push('3. Check status:');
  lines.push('   docker-compose ps\n');

  lines.push('4. View logs:');
  lines.push('   docker-compose logs -f obi');
  if (config.includeCollector) {
    lines.push('   docker-compose logs -f otel-collector');
  }
  lines.push('');

  lines.push('5. Stop the stack:');
  lines.push('   docker-compose down\n');

  if (config.includeCollector) {
    lines.push('--- OpenTelemetry Collector Endpoints ---');
    lines.push('OTLP gRPC: localhost:4317');
    lines.push('OTLP HTTP: localhost:4318');
    lines.push('Health Check: localhost:55679\n');
  }

  lines.push('--- Alternative: Use obi_docker_deploy ---');
  lines.push('For quick deployment without compose files,');
  lines.push('use the `obi_docker_deploy` tool instead.');

  return lines.join('\n');
}
