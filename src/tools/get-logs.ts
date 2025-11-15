/**
 * OBI Get Logs Tool
 * Retrieves recent logs from the OBI process
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import obiManager from '../utils/obi-manager.js';
import logger from '../utils/logger.js';
import { GetLogsArgs } from '../types/mcp.js';

/**
 * Tool definition for MCP
 */
export const getLogsTool: Tool = {
  name: 'obi_get_logs',
  description:
    'Retrieve recent logs from the OpenTelemetry eBPF Instrumentation (OBI) process. ' +
    'Returns log entries with optional filtering by log level (info, warn, error, debug, or all).',
  inputSchema: {
    type: 'object',
    properties: {
      lines: {
        type: 'number',
        description: 'Number of recent log lines to retrieve',
        default: 100,
        minimum: 1,
        maximum: 10000,
      },
      level: {
        type: 'string',
        description: 'Filter logs by level (info, warn, error, debug, or all for no filtering)',
        enum: ['info', 'warn', 'error', 'debug', 'all'],
      },
    },
  },
};

/**
 * Argument validation schema
 */
const GetLogsArgsSchema = z.object({
  lines: z.number().min(1).max(10000).optional().default(100),
  level: z.enum(['info', 'warn', 'error', 'debug', 'all']).optional(),
});

/**
 * Tool handler implementation
 */
export async function handleGetLogs(args: unknown) {
  try {
    // Validate arguments
    const validatedArgs = GetLogsArgsSchema.parse(args) as GetLogsArgs;

    logger.info('Getting OBI logs', {
      lines: validatedArgs.lines,
      level: validatedArgs.level,
    });

    // Get logs from OBI manager
    const logs = await obiManager.getLogs(validatedArgs.lines);

    // Filter by level if specified and not 'all'
    let filteredLogs = logs;
    if (validatedArgs.level && validatedArgs.level !== 'all') {
      const levelPattern = new RegExp(`\\[(${validatedArgs.level})\\]`, 'i');
      filteredLogs = logs.filter((line) => levelPattern.test(line));
    }

    // Return formatted text content
    return {
      content: [
        {
          type: 'text',
          text: formatLogsResponse(filteredLogs, validatedArgs),
        },
      ],
    };
  } catch (error) {
    logger.error('Error getting OBI logs', { error });
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
 * Format logs response as human-readable text
 */
function formatLogsResponse(logs: string[], args: GetLogsArgs): string {
  const lines: string[] = [];

  const headerParts = ['=== OBI Logs ==='];
  if (args.level && args.level !== 'all') {
    headerParts.push(`[Level: ${args.level.toUpperCase()}]`);
  }
  headerParts.push(`[Last ${logs.length} lines]`);

  lines.push(headerParts.join(' '));
  lines.push('');

  if (logs.length === 0) {
    lines.push('No logs available');
    if (args.level && args.level !== 'all') {
      lines.push(`(No logs found matching level: ${args.level})`);
    }
  } else {
    // Add log entries
    logs.forEach((log) => {
      lines.push(log);
    });
  }

  lines.push('');
  lines.push('--- End of Logs ---');

  return lines.join('\n');
}
