/**
 * OBI Deploy Local Tool
 * Deploys OBI locally in standalone mode
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import obiManager from '../utils/obi-manager.js';
import logger from '../utils/logger.js';
import { DeployLocalArgs } from '../types/mcp.js';
import { ObiDeploymentMode } from '../types/obi.js';

/**
 * Tool definition for MCP
 */
export const getDeployLocalTool: Tool = {
  name: 'obi_deploy_local',
  description:
    'Deploy the OpenTelemetry eBPF Instrumentation (OBI) locally in standalone mode. ' +
    'This tool starts the OBI process with the specified configuration. ' +
    'You can provide either a config object directly or a path to a configuration file.',
  inputSchema: {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        description: 'OBI configuration object (optional if configPath is provided)',
      },
      configPath: {
        type: 'string',
        description: 'Path to OBI configuration file (optional if config is provided)',
      },
      binaryPath: {
        type: 'string',
        description: 'Path to OBI binary (optional, uses PATH if not provided)',
      },
    },
  },
};

/**
 * Argument validation schema
 */
const DeployLocalArgsSchema = z.object({
  config: z.record(z.unknown()).optional(),
  configPath: z.string().optional(),
  binaryPath: z.string().optional(),
});

/**
 * Tool handler implementation
 */
export async function handleDeployLocal(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = DeployLocalArgsSchema.parse(args) as DeployLocalArgs;

    logger.info('Deploying OBI locally', {
      hasConfig: !!validatedArgs.config,
      configPath: validatedArgs.configPath,
      binaryPath: validatedArgs.binaryPath,
    });

    // Build deployment options
    const deploymentOptions = {
      mode: ObiDeploymentMode.STANDALONE,
      ...(validatedArgs.config && { config: validatedArgs.config }),
      ...(validatedArgs.configPath && { configPath: validatedArgs.configPath }),
      ...(validatedArgs.binaryPath && { binaryPath: validatedArgs.binaryPath }),
    };

    // Deploy OBI locally
    const result = await obiManager.deployLocal(deploymentOptions);

    // Format response
    return {
      content: [
        {
          type: 'text',
          text: formatDeploymentResponse(result),
        },
      ],
      isError: !result.success,
    };
  } catch (error) {
    logger.error('Error deploying OBI locally', { error });
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format deployment response as human-readable text
 */
function formatDeploymentResponse(result: {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}): string {
  const lines: string[] = [];

  lines.push('=== OBI Local Deployment ===\n');

  if (result.success) {
    lines.push(`Status: SUCCESS`);
    lines.push(`Message: ${result.message}`);

    if (result.data) {
      const data = result.data as Record<string, unknown>;
      if (data.pid) {
        lines.push(`PID: ${data.pid}`);
      }
      if (data.configPath) {
        lines.push(`Config Path: ${data.configPath}`);
      }
    }
  } else {
    lines.push(`Status: FAILED`);
    lines.push(`Message: ${result.message}`);

    if (result.error) {
      lines.push(`\nError Details: ${result.error}`);
    }
  }

  return lines.join('\n');
}
