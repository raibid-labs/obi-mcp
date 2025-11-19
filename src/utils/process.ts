/**
 * Process management utilities
 * Re-exports from core for backward compatibility
 * @deprecated Import from '../core/index.js' instead
 */

export {
  isProcessRunning,
  getProcessInfo,
  findProcessByName,
  killProcess,
} from '../core/utils/process.js';
