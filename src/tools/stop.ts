/**
 * OBI Stop Tool
 * Stops the running OBI process
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import obiManager from '../utils/obi-manager.js';
import logger from '../utils/logger.js';
import { StopArgs } from '../types/mcp.js';

/**
 * Tool definition for MCP
 */
export const stopTool: Tool = {
  name: 'obi_stop',
  description:
    'Stop the running OpenTelemetry eBPF Instrumentation (OBI) process. ' +
    'Gracefully terminates the OBI process using SIGTERM, with SIGKILL as fallback. ' +
    'Use force=true to immediately send SIGKILL instead of graceful shutdown.',
  inputSchema: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force immediate termination using SIGKILL instead of graceful SIGTERM',
        default: false,
      },
    },
  },
};

/**
 * Argument validation schema
 */
const StopArgsSchema = z.object({
  force: z.boolean().optional().default(false),
});

/**
 * Tool handler implementation
 */
export async function handleStop(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = StopArgsSchema.parse(args) as StopArgs;

    logger.info('Stopping OBI process', { force: validatedArgs.force });

    // Note: Current ObiManager.stop() doesn't support force parameter yet
    // It always attempts graceful shutdown first with SIGTERM, then SIGKILL if needed
    const result = await obiManager.stop();

    // Format response based on result
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: formatSuccessResponse(result.message),
          },
        ],
      };
    } else {
      // Check if it's a "not running" error - this is not a critical error
      const isNotRunning = result.message.toLowerCase().includes('not running');

      return {
        content: [
          {
            type: 'text',
            text: formatErrorResponse(result.message, result.error, isNotRunning),
          },
        ],
        isError: !isNotRunning, // Don't mark as error if it's just "not running"
      };
    }
  } catch (error) {
    logger.error('Error stopping OBI', { error });
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
function formatSuccessResponse(message: string): string {
  const lines: string[] = [];

  lines.push('=== OBI Stop ===\n');
  lines.push(`Status: Success`);
  lines.push(`Message: ${message}`);
  lines.push('\nThe OBI process has been stopped successfully.');

  return lines.join('\n');
}

/**
 * Format error response as human-readable text
 */
function formatErrorResponse(message: string, error?: string, isNotRunning = false): string {
  const lines: string[] = [];

  lines.push('=== OBI Stop ===\n');

  if (isNotRunning) {
    lines.push(`Status: Not Running`);
    lines.push(`Message: ${message}`);
    lines.push('\nThe OBI process is not currently running. Nothing to stop.');
  } else {
    lines.push(`Status: Failed`);
    lines.push(`Message: ${message}`);
    if (error) {
      lines.push(`\nError: ${error}`);
    }
  }

  return lines.join('\n');
}
