/**
 * Local Toolset Resources
 * MCP Resources for local OBI deployment
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import obiManager from '../obi-manager.js';
import { logger, ObiStatus } from '../../../core/index.js';

/**
 * Resource URI patterns
 */
export const OBI_RESOURCE_URIS = {
  CONFIG_CURRENT: 'obi://config/current',
  STATUS_HEALTH: 'obi://status/health',
  LOGS_RECENT: 'obi://logs/recent',
} as const;

/**
 * Resource definitions for MCP
 */
export const resources: Resource[] = [
  {
    uri: OBI_RESOURCE_URIS.CONFIG_CURRENT,
    name: 'Current OBI Configuration',
    description: 'The current OBI configuration in JSON format',
    mimeType: 'application/json',
  },
  {
    uri: OBI_RESOURCE_URIS.STATUS_HEALTH,
    name: 'OBI Process Health',
    description: 'Current health status and metrics of the OBI process',
    mimeType: 'application/json',
  },
  {
    uri: OBI_RESOURCE_URIS.LOGS_RECENT,
    name: 'Recent OBI Logs',
    description: 'Last 100 lines from OBI logs',
    mimeType: 'text/plain',
  },
];

/**
 * Handle resource read requests
 */
export async function handleResourceRead(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
  }>;
}> {
  logger.debug(`Reading resource: ${uri}`);

  try {
    switch (uri) {
      case OBI_RESOURCE_URIS.CONFIG_CURRENT:
        return await readCurrentConfig(uri);

      case OBI_RESOURCE_URIS.STATUS_HEALTH:
        return await readHealthStatus(uri);

      case OBI_RESOURCE_URIS.LOGS_RECENT:
        return await readRecentLogs(uri);

      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  } catch (error) {
    logger.error(`Error reading resource ${uri}:`, error);
    throw error;
  }
}

/**
 * Read current OBI configuration
 */
async function readCurrentConfig(uri: string) {
  const config = await obiManager.getConfig();

  if (!config) {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: 'No configuration available',
              message: 'OBI has not been deployed yet or config path is not set',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(config, null, 2),
      },
    ],
  };
}

/**
 * Read OBI health status
 */
async function readHealthStatus(uri: string) {
  const health = await obiManager.getStatus(true); // verbose = true for detailed metrics

  // Format health data with all available information
  const healthData = {
    status: health.status,
    running: health.status === ObiStatus.RUNNING,
    ...(health.pid && { pid: health.pid }),
    ...(health.uptime !== undefined && { uptimeSeconds: health.uptime }),
    ...(health.cpuUsage !== undefined && { cpuUsagePercent: health.cpuUsage }),
    ...(health.memoryUsage !== undefined && { memoryUsageMB: health.memoryUsage }),
    ...(health.configPath && { configPath: health.configPath }),
    ...(health.lastError && { lastError: health.lastError }),
    timestamp: new Date().toISOString(),
  };

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(healthData, null, 2),
      },
    ],
  };
}

/**
 * Read recent OBI logs
 */
async function readRecentLogs(uri: string) {
  const logLines = await obiManager.getLogs(100); // Get last 100 lines

  // Join log lines into a single text block
  const logText = logLines.join('\n');

  return {
    contents: [
      {
        uri,
        mimeType: 'text/plain',
        text: logText || 'No logs available',
      },
    ],
  };
}

/**
 * List all available resources
 */
export function listResources(): { resources: Resource[] } {
  logger.debug(`Listing ${resources.length} resources`);
  return { resources };
}
