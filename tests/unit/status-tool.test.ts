/**
 * Unit tests for obi_get_status tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStatusTool, handleGetStatus } from '../../src/tools/status.js';
import obiManager from '../../src/utils/obi-manager.js';
import { ObiStatus } from '../../src/types/obi.js';

// Mock obiManager
vi.mock('../../src/utils/obi-manager.js', () => ({
  default: {
    getStatus: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('obi_get_status tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getStatusTool.name).toBe('obi_get_status');
    });

    it('should have description', () => {
      expect(getStatusTool.description).toBeTruthy();
      expect(getStatusTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(getStatusTool.inputSchema).toBeDefined();
      expect(getStatusTool.inputSchema.type).toBe('object');
      expect(getStatusTool.inputSchema.properties).toBeDefined();
    });

    it('should accept verbose parameter', () => {
      expect(getStatusTool.inputSchema.properties?.verbose).toBeDefined();
      expect(getStatusTool.inputSchema.properties?.verbose.type).toBe('boolean');
    });
  });

  describe('handleGetStatus', () => {
    it('should handle status request with default args', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 3600,
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({});

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('OBI Status');
      expect(result.content[0].text).toContain('running');
      expect(result.isError).toBeFalsy();
    });

    it('should handle status request with verbose=false', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 3600,
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({ verbose: false });

      expect(result.content[0].text).not.toContain('Details');
      expect(obiManager.getStatus).toHaveBeenCalledWith(false);
    });

    it('should handle status request with verbose=true', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 3600,
        cpuUsage: 15.5,
        memoryUsage: 256.7,
        configPath: '/path/to/config.yml',
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({ verbose: true });

      expect(result.content[0].text).toContain('Details');
      expect(result.content[0].text).toContain('15.50%');
      expect(result.content[0].text).toContain('256.70 MB');
      expect(result.content[0].text).toContain('/path/to/config.yml');
      expect(obiManager.getStatus).toHaveBeenCalledWith(true);
    });

    it('should handle stopped status', async () => {
      const mockStatus = {
        status: ObiStatus.STOPPED,
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({});

      expect(result.content[0].text).toContain('stopped');
      expect(result.isError).toBeFalsy();
    });

    it('should handle error status', async () => {
      const mockStatus = {
        status: ObiStatus.ERROR,
        lastError: 'Process crashed unexpectedly',
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({});

      expect(result.content[0].text).toContain('error');
      expect(result.content[0].text).toContain('Process crashed unexpectedly');
      expect(result.isError).toBeFalsy();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(obiManager.getStatus).mockRejectedValue(new Error('Failed to get status'));

      const result = await handleGetStatus({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to get status');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.getStatus).mockRejectedValue('String error');

      const result = await handleGetStatus({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should validate input schema', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      // Valid input
      const result = await handleGetStatus({ verbose: true });
      expect(result.isError).toBeFalsy();

      // Invalid input type should be coerced or fail
      const invalidResult = await handleGetStatus({ verbose: 'invalid' });
      expect(invalidResult.isError).toBe(true);
    });

    it('should include uptime in formatted output', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 7200,
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({});

      expect(result.content[0].text).toContain('7200s');
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockStatus = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        // No uptime, cpuUsage, memoryUsage
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockStatus);

      const result = await handleGetStatus({ verbose: true });

      expect(result.content[0].text).toContain('OBI Status');
      expect(result.content[0].text).toContain('12345');
      expect(result.content[0].text).toContain('N/A');
      expect(result.isError).toBeFalsy();
    });
  });
});
