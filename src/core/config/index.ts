/**
 * Core Configuration Module
 * Manages configuration for toolsets and OBI deployments
 */

export { ObiConfigSchema, type ObiConfig } from './schema.js';

/**
 * Toolset configuration
 */
export interface ToolsetConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  toolsets?: {
    local?: ToolsetConfig;
    // Future toolsets will be added here
    // kubernetes?: ToolsetConfig;
    // docker?: ToolsetConfig;
  };
}

/**
 * Get configuration from environment or defaults
 */
export function getServerConfig(): ServerConfig {
  // Default: enable local toolset
  return {
    toolsets: {
      local: {
        enabled: true,
      },
    },
  };
}
