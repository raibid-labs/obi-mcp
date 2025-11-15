/**
 * Unit tests for obi_get_logs tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLogsTool, handleGetLogs } from '../../../src/tools/get-logs.js';
import obiManager from '../../../src/utils/obi-manager.js';

// Mock obiManager
vi.mock('../../../src/utils/obi-manager.js', () => ({
  default: {
    getLogs: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('obi_get_logs tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getLogsTool.name).toBe('obi_get_logs');
    });

    it('should have description', () => {
      expect(getLogsTool.description).toBeTruthy();
      expect(getLogsTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(getLogsTool.inputSchema).toBeDefined();
      expect(getLogsTool.inputSchema.type).toBe('object');
      expect(getLogsTool.inputSchema.properties).toBeDefined();
    });

    it('should accept lines parameter with constraints', () => {
      expect(getLogsTool.inputSchema.properties?.lines).toBeDefined();
      expect(getLogsTool.inputSchema.properties?.lines.type).toBe('number');
      expect(getLogsTool.inputSchema.properties?.lines.default).toBe(100);
      expect(getLogsTool.inputSchema.properties?.lines.minimum).toBe(1);
      expect(getLogsTool.inputSchema.properties?.lines.maximum).toBe(10000);
    });

    it('should accept level parameter with enum values', () => {
      expect(getLogsTool.inputSchema.properties?.level).toBeDefined();
      expect(getLogsTool.inputSchema.properties?.level.type).toBe('string');
      expect(getLogsTool.inputSchema.properties?.level.enum).toContain('info');
      expect(getLogsTool.inputSchema.properties?.level.enum).toContain('warn');
      expect(getLogsTool.inputSchema.properties?.level.enum).toContain('error');
      expect(getLogsTool.inputSchema.properties?.level.enum).toContain('debug');
      expect(getLogsTool.inputSchema.properties?.level.enum).toContain('all');
    });
  });

  describe('handleGetLogs', () => {
    it('should handle logs request with default args', async () => {
      const mockLogs = [
        '[info] OBI started successfully',
        '[info] Listening on port 8080',
        '[info] Processing spans',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({});

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('OBI Logs');
      expect(result.content[0].text).toContain('OBI started successfully');
      expect(result.content[0].text).toContain('Last 3 lines');
      expect(result.isError).toBeFalsy();
      expect(obiManager.getLogs).toHaveBeenCalledWith(100);
    });

    it('should handle logs request with custom line count', async () => {
      const mockLogs = ['[info] Log 1', '[info] Log 2', '[info] Log 3'];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ lines: 50 });

      expect(result.content[0].text).toContain('OBI Logs');
      expect(result.isError).toBeFalsy();
      expect(obiManager.getLogs).toHaveBeenCalledWith(50);
    });

    it('should filter logs by error level', async () => {
      const mockLogs = [
        '[info] Starting OBI',
        '[error] Connection failed',
        '[warn] Retrying connection',
        '[error] Max retries exceeded',
        '[info] Shutting down',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'error' });

      expect(result.content[0].text).toContain('[Level: ERROR]');
      expect(result.content[0].text).toContain('Connection failed');
      expect(result.content[0].text).toContain('Max retries exceeded');
      expect(result.content[0].text).not.toContain('Starting OBI');
      expect(result.content[0].text).not.toContain('Retrying connection');
    });

    it('should filter logs by warn level', async () => {
      const mockLogs = [
        '[info] Starting',
        '[warn] Configuration warning',
        '[error] Error occurred',
        '[warn] Performance warning',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'warn' });

      expect(result.content[0].text).toContain('[Level: WARN]');
      expect(result.content[0].text).toContain('Configuration warning');
      expect(result.content[0].text).toContain('Performance warning');
      expect(result.content[0].text).not.toContain('Starting');
      expect(result.content[0].text).not.toContain('Error occurred');
    });

    it('should filter logs by info level', async () => {
      const mockLogs = [
        '[info] Started successfully',
        '[error] Error occurred',
        '[info] Processing data',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'info' });

      expect(result.content[0].text).toContain('Started successfully');
      expect(result.content[0].text).toContain('Processing data');
      expect(result.content[0].text).not.toContain('Error occurred');
    });

    it('should filter logs by debug level', async () => {
      const mockLogs = [
        '[debug] Debug info 1',
        '[info] Info message',
        '[debug] Debug info 2',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'debug' });

      expect(result.content[0].text).toContain('Debug info 1');
      expect(result.content[0].text).toContain('Debug info 2');
      expect(result.content[0].text).not.toContain('Info message');
    });

    it('should not filter logs when level is "all"', async () => {
      const mockLogs = [
        '[info] Info message',
        '[warn] Warning message',
        '[error] Error message',
        '[debug] Debug message',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'all' });

      expect(result.content[0].text).toContain('Info message');
      expect(result.content[0].text).toContain('Warning message');
      expect(result.content[0].text).toContain('Error message');
      expect(result.content[0].text).toContain('Debug message');
    });

    it('should handle empty logs', async () => {
      vi.mocked(obiManager.getLogs).mockResolvedValue([]);

      const result = await handleGetLogs({});

      expect(result.content[0].text).toContain('No logs available');
      expect(result.isError).toBeFalsy();
    });

    it('should handle empty logs after filtering', async () => {
      const mockLogs = ['[info] Info only', '[info] Another info'];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'error' });

      expect(result.content[0].text).toContain('No logs available');
      expect(result.content[0].text).toContain('No logs found matching level: error');
    });

    it('should handle error when retrieving logs', async () => {
      vi.mocked(obiManager.getLogs).mockRejectedValue(new Error('Failed to read log file'));

      const result = await handleGetLogs({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to read log file');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.getLogs).mockRejectedValue('String error');

      const result = await handleGetLogs({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should validate line count minimum', async () => {
      const result = await handleGetLogs({ lines: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should validate line count maximum', async () => {
      const result = await handleGetLogs({ lines: 20000 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should handle case-insensitive log level filtering', async () => {
      const mockLogs = [
        '[INFO] Upper case info',
        '[Error] Mixed case error',
        '[warn] Lower case warn',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'error' });

      expect(result.content[0].text).toContain('Mixed case error');
      expect(result.content[0].text).not.toContain('Upper case info');
    });

    it('should combine lines and level parameters', async () => {
      const mockLogs = [
        '[error] Error 1',
        '[info] Info 1',
        '[error] Error 2',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ lines: 200, level: 'error' });

      expect(result.content[0].text).toContain('Error 1');
      expect(result.content[0].text).toContain('Error 2');
      expect(result.content[0].text).not.toContain('Info 1');
      expect(obiManager.getLogs).toHaveBeenCalledWith(200);
    });

    it('should include proper header formatting', async () => {
      const mockLogs = ['[info] Test'];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({});

      expect(result.content[0].text).toContain('=== OBI Logs ===');
      expect(result.content[0].text).toContain('--- End of Logs ---');
    });

    it('should show filtered count in header', async () => {
      const mockLogs = [
        '[error] Error 1',
        '[info] Info 1',
        '[error] Error 2',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleGetLogs({ level: 'error' });

      expect(result.content[0].text).toContain('[Last 2 lines]');
    });
  });
});
