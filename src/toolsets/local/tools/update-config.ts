/**
 * OBI Update Config Tool
 * Updates OBI configuration with validation and optional restart
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import obiManager from '../obi-manager.js';
import { logger, ObiConfigSchema } from '../../../core/index.js';

/**
 * Tool argument types
 */
export interface UpdateConfigArgs {
  config: Record<string, unknown>;
  merge?: boolean;
  restart?: boolean;
}

/**
 * Tool definition for MCP
 */
export const updateConfigTool: Tool = {
  name: 'obi_update_config',
  description:
    'Update the OpenTelemetry eBPF Instrumentation (OBI) configuration. ' +
    'Supports merging with existing config or replacing entirely. ' +
    'Can optionally restart OBI to apply changes immediately.',
  inputSchema: {
    type: 'object',
    properties: {
      config: {
        type: 'object',
        description: 'New configuration object (or partial config if merge=true)',
        properties: {
          network: {
            type: 'object',
            properties: {
              enable: { type: 'boolean' },
              allowed_attributes: {
                type: 'array',
                items: { type: 'string' },
              },
              cidrs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    cidr: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          attributes: {
            type: 'object',
            properties: {
              kubernetes: {
                type: 'object',
                properties: {
                  enable: { type: 'boolean' },
                },
              },
            },
          },
          export: {
            type: 'object',
            properties: {
              otlp: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  protocol: {
                    type: 'string',
                    enum: ['grpc', 'http/protobuf'],
                  },
                },
              },
            },
          },
        },
      },
      merge: {
        type: 'boolean',
        description: 'If true, merge with existing config; if false, replace entirely',
        default: true,
      },
      restart: {
        type: 'boolean',
        description: 'If true, restart OBI after updating config to apply changes',
        default: false,
      },
    },
    required: ['config'],
  },
};

/**
 * Argument validation schema
 */
const UpdateConfigArgsSchema = z.object({
  config: z.record(z.unknown()),
  merge: z.boolean().optional().default(true),
  restart: z.boolean().optional().default(false),
});

/**
 * Tool handler implementation
 */
export async function handleUpdateConfig(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = UpdateConfigArgsSchema.parse(args) as UpdateConfigArgs;

    logger.info('Updating OBI config', {
      merge: validatedArgs.merge,
      restart: validatedArgs.restart,
    });

    // Validate config structure against ObiConfigSchema
    let validatedConfig;
    try {
      validatedConfig = ObiConfigSchema.parse(validatedArgs.config);
    } catch (error) {
      logger.error('Config validation failed', { error });
      return {
        content: [
          {
            type: 'text',
            text: `Error: Invalid configuration structure\n${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }

    // Update config via OBI manager
    const result = await obiManager.updateConfig(
      validatedConfig,
      validatedArgs.merge,
      validatedArgs.restart
    );

    if (result.success) {
      // Format success response
      return {
        content: [
          {
            type: 'text',
            text: formatSuccessResponse(result, validatedArgs.restart ?? false),
          },
        ],
      };
    } else {
      // Format error response
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${result.message}\n${result.error || ''}`,
          },
        ],
        isError: true,
      };
    }
  } catch (error) {
    logger.error('Error updating OBI config', { error });
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
 * Format success response as human-readable text
 */
function formatSuccessResponse(
  result: { success: boolean; message: string; data?: unknown },
  restart: boolean
): string {
  const lines: string[] = [];

  lines.push('=== OBI Config Update ===\n');
  lines.push(`Status: Success`);
  lines.push(`Message: ${result.message}`);

  if (restart) {
    lines.push('\nOBI has been restarted with the new configuration.');
  } else {
    lines.push('\nNote: Restart OBI for changes to take effect.');
  }

  if (result.data) {
    lines.push('\n--- Updated Configuration ---');
    lines.push(JSON.stringify(result.data, null, 2));
  }

  return lines.join('\n');
}
