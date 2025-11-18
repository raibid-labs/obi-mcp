/**
 * Core Type Definitions for OBI MCP
 * Shared types used across all toolsets
 */

/**
 * OBI process status
 */
export enum ObiStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
  UNKNOWN = 'unknown',
}

/**
 * OBI deployment mode
 */
export enum ObiDeploymentMode {
  STANDALONE = 'standalone',
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes',
}

/**
 * OBI health check result
 */
export interface ObiHealthCheck {
  status: ObiStatus;
  pid?: number;
  uptime?: number; // seconds
  cpuUsage?: number; // percentage
  memoryUsage?: number; // MB
  lastError?: string;
  configPath?: string;
}

/**
 * OBI metrics summary (parsed from logs)
 */
export interface ObiMetricsSummary {
  totalFlows: number;
  uniqueSourceIPs: number;
  uniqueDestinationIPs: number;
  protocols: Record<string, number>; // e.g., { "HTTP": 150, "gRPC": 50 }
  topSources: Array<{ ip: string; count: number }>;
  topDestinations: Array<{ ip: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * OBI log entry (parsed)
 */
export interface ObiLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  fields?: Record<string, unknown>;
}

/**
 * OBI deployment options
 */
export interface ObiDeploymentOptions {
  mode: ObiDeploymentMode;
  configPath?: string;
  config?: Record<string, unknown>; // ObiConfig from core/config
  binaryPath?: string; // path to OBI binary (if not in PATH)
  logPath?: string; // where to store logs
  autoRestart?: boolean;
}

/**
 * OBI control result
 */
export interface ObiControlResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}
