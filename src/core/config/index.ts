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
    kubernetes?: ToolsetConfig;
    docker?: ToolsetConfig;
  };
}

/**
 * Get configuration from environment or defaults
 */
export function getServerConfig(): ServerConfig {
  // Default: enable all toolsets
  return {
    toolsets: {
      local: {
        enabled: true,
      },
      docker: {
        enabled: process.env.ENABLE_DOCKER_TOOLSET !== 'false',
      },
      kubernetes: {
        enabled: process.env.ENABLE_K8S_TOOLSET !== 'false',
      },
    },
  };
}
