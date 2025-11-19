/**
 * OBI Get Config Tool
 * Retrieves current OBI configuration
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import obiManager from '../obi-manager.js';
import { logger } from '../../../core/index.js';

/**
 * Tool definition for MCP
 */
export const getConfigTool: Tool = {
  name: 'obi_get_config',
  description:
    'Retrieve the current OpenTelemetry eBPF Instrumentation (OBI) configuration. ' +
    'Returns the active configuration including network settings, attributes, and export endpoints.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

/**
 * Argument validation schema (no arguments needed)
 */
const GetConfigArgsSchema = z.object({});

/**
 * Tool handler implementation
 */
export async function handleGetConfig(args: unknown) {
  try {
    // Validate arguments (empty object expected)
    GetConfigArgsSchema.parse(args);

    logger.info('Getting OBI configuration');

    // Get config from OBI manager
    const config = await obiManager.getConfig();

    // Handle null case (no config available)
    if (!config) {
      return {
        content: [
          {
            type: 'text',
            text: 'No OBI configuration available. OBI has not been deployed yet or config file is missing.',
          },
        ],
      };
    }

    // Format config as pretty JSON
    const formattedConfig = JSON.stringify(config, null, 2);

    // Return formatted text content
    return {
      content: [
        {
          type: 'text',
          text: formatConfigResponse(formattedConfig),
        },
      ],
    };
  } catch (error) {
    logger.error('Error getting OBI config', { error });
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
 * Format config response as human-readable text
 */
function formatConfigResponse(configJson: string): string {
  const lines: string[] = [];

  lines.push('=== OBI Configuration ===\n');
  lines.push(configJson);

  return lines.join('\n');
}
