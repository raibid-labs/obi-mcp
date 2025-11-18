/**
 * Type definitions for OpenTelemetry eBPF Instrumentation (OBI)
 * Re-exports from core for backward compatibility
 * @deprecated Import from '../core/index.js' instead
 */

export {
  ObiStatus,
  ObiDeploymentMode,
  type ObiHealthCheck,
  type ObiMetricsSummary,
  type ObiLogEntry,
  type ObiDeploymentOptions,
  type ObiControlResult,
} from '../core/types/index.js';

export { ObiConfigSchema, type ObiConfig } from '../core/config/schema.js';
