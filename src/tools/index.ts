/**
 * Export all MCP tools
 * Re-exports from local toolset for backward compatibility
 * @deprecated Import from '../toolsets/local/tools/index.js' instead
 */

export {
  getStatusTool,
  handleGetStatus,
  getConfigTool,
  handleGetConfig,
  getLogsTool,
  handleGetLogs,
  getDeployLocalTool,
  handleDeployLocal,
  updateConfigTool,
  handleUpdateConfig,
  stopTool,
  handleStop,
} from '../toolsets/local/tools/index.js';
