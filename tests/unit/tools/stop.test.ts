/**
 * Unit tests for obi_stop tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stopTool, handleStop } from '../../../src/tools/stop.js';
import obiManager from '../../../src/utils/obi-manager.js';

// Mock obiManager
vi.mock('../../../src/utils/obi-manager.js', () => ({
  default: {
    stop: vi.fn(),
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

describe('obi_stop tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(stopTool.name).toBe('obi_stop');
    });

    it('should have description', () => {
      expect(stopTool.description).toBeTruthy();
      expect(stopTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(stopTool.inputSchema).toBeDefined();
      expect(stopTool.inputSchema.type).toBe('object');
      expect(stopTool.inputSchema.properties).toBeDefined();
    });

    it('should accept force parameter', () => {
      expect(stopTool.inputSchema.properties?.force).toBeDefined();
      expect(stopTool.inputSchema.properties?.force.type).toBe('boolean');
      expect(stopTool.inputSchema.properties?.force.default).toBe(false);
    });
  });

  describe('handleStop', () => {
    it('should handle successful stop', async () => {
      const mockResult = {
        success: true,
        message: 'OBI stopped successfully',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Success');
      expect(result.content[0].text).toContain('stopped successfully');
      expect(result.isError).toBeFalsy();
      expect(obiManager.stop).toHaveBeenCalled();
    });

    it('should handle stop with force=false', async () => {
      const mockResult = {
        success: true,
        message: 'OBI stopped gracefully',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({ force: false });

      expect(result.content[0].text).toContain('Success');
      expect(result.isError).toBeFalsy();
      expect(obiManager.stop).toHaveBeenCalled();
    });

    it('should handle stop with force=true', async () => {
      const mockResult = {
        success: true,
        message: 'OBI stopped forcefully',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({ force: true });

      expect(result.content[0].text).toContain('Success');
      expect(result.isError).toBeFalsy();
      expect(obiManager.stop).toHaveBeenCalled();
    });

    it('should handle "not running" error gracefully', async () => {
      const mockResult = {
        success: false,
        message: 'OBI is not running',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Not Running');
      expect(result.content[0].text).toContain('not currently running');
      expect(result.isError).toBeFalsy(); // Not an error, just informational
    });

    it('should handle stop failure with error', async () => {
      const mockResult = {
        success: false,
        message: 'Failed to stop OBI',
        error: 'Permission denied',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Failed');
      expect(result.content[0].text).toContain('Permission denied');
      expect(result.isError).toBe(true);
    });

    it('should handle exception during stop', async () => {
      vi.mocked(obiManager.stop).mockRejectedValue(new Error('Process kill failed'));

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Process kill failed');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.stop).mockRejectedValue('String error');

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should format success response correctly', async () => {
      const mockResult = {
        success: true,
        message: 'Process terminated',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('=== OBI Stop ===');
      expect(result.content[0].text).toContain('Status: Success');
      expect(result.content[0].text).toContain('Message: Process terminated');
    });

    it('should distinguish between "not running" and other failures', async () => {
      const notRunningResult = {
        success: false,
        message: 'OBI is not running currently',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(notRunningResult);

      const result1 = await handleStop({});
      expect(result1.isError).toBeFalsy();

      const failureResult = {
        success: false,
        message: 'Failed to terminate process',
        error: 'SIGTERM failed',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(failureResult);

      const result2 = await handleStop({});
      expect(result2.isError).toBe(true);
    });

    it('should use default value for force parameter', async () => {
      const mockResult = {
        success: true,
        message: 'Stopped',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.isError).toBeFalsy();
      expect(obiManager.stop).toHaveBeenCalled();
    });

    it('should detect "not running" message (case 1)', async () => {
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: false,
        message: 'OBI is not running',
      });

      const result = await handleStop({});
      expect(result.isError).toBeFalsy();
    });

    it('should detect "not running" message (case 2)', async () => {
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: false,
        message: 'Process not running',
      });

      const result = await handleStop({});
      expect(result.isError).toBeFalsy();
    });

    it('should detect "not running" message (case 3)', async () => {
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: false,
        message: 'Service is currently not running',
      });

      const result = await handleStop({});
      expect(result.isError).toBeFalsy();
    });

    it('should include proper formatting in response', async () => {
      const mockResult = {
        success: true,
        message: 'Stopped successfully',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('===');
      expect(result.content[0].text).toMatch(/Status:/);
      expect(result.content[0].text).toMatch(/Message:/);
    });

    it('should handle validation errors', async () => {
      const result = await handleStop({ force: 'invalid' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should show appropriate message for graceful shutdown', async () => {
      const mockResult = {
        success: true,
        message: 'OBI stopped successfully',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('stopped successfully');
    });

    it('should handle error message without additional error field', async () => {
      const mockResult = {
        success: false,
        message: 'Stop operation failed',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Failed');
      expect(result.content[0].text).toContain('Stop operation failed');
      expect(result.isError).toBe(true);
    });

    it('should properly format error response with error field', async () => {
      const mockResult = {
        success: false,
        message: 'Could not stop process',
        error: 'PID not found',
      };

      vi.mocked(obiManager.stop).mockResolvedValue(mockResult);

      const result = await handleStop({});

      expect(result.content[0].text).toContain('Could not stop process');
      expect(result.content[0].text).toContain('PID not found');
    });
  });
});
