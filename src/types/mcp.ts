/**
 * MCP-specific type definitions
 * Re-exports from local toolset for backward compatibility
 */

// Re-export argument types from local toolset tools
export type { GetStatusArgs } from '../toolsets/local/tools/status.js';
export type { StopArgs } from '../toolsets/local/tools/stop.js';
export type { GetLogsArgs } from '../toolsets/local/tools/get-logs.js';
export type { UpdateConfigArgs } from '../toolsets/local/tools/update-config.js';
export type { DeployLocalArgs } from '../toolsets/local/tools/deploy-local.js';

/**
 * Additional MCP argument types (not yet implemented)
 */
export interface GetMetricsSummaryArgs {
  timeRangeMinutes?: number;
  aggregateBy?: 'protocol' | 'source' | 'destination';
}

/**
 * Resource URI patterns
 */
export { OBI_RESOURCE_URIS } from '../toolsets/local/resources/index.js';

/**
 * Prompt templates
 */
export const OBI_PROMPTS = {
  SETUP_LOCAL: 'setup-obi-local',
  DIAGNOSE_ISSUES: 'diagnose-obi-issues',
  ANALYZE_NETWORK: 'analyze-network-flows',
} as const;
