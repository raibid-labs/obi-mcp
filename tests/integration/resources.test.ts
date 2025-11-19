/**
 * Integration Tests for MCP Resources
 * Tests resource listing and reading functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listResources, handleResourceRead } from '../../src/resources/index.js';
import obiManager from '../../src/toolsets/local/obi-manager.js';
import { OBI_RESOURCE_URIS } from '../../src/types/mcp.js';
import { ObiStatus } from '../../src/types/obi.js';

// Mock ObiManager
vi.mock('../../src/toolsets/local/obi-manager.js', () => {
  const mockManager = {
    getStatus: vi.fn(),
    getConfig: vi.fn(),
    getLogs: vi.fn(),
  };
  return {
    default: mockManager,
  };
});

describe('Resource Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Resources', () => {
    it('should list all available resources', () => {
      const result = listResources();

      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources).toHaveLength(3);
    });

    it('should return resources with correct structure', () => {
      const result = listResources();

      result.resources.forEach((resource) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');

        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
        expect(typeof resource.description).toBe('string');
        expect(typeof resource.mimeType).toBe('string');

        expect(resource.uri).toMatch(/^obi:\/\//);
      });
    });

    it('should include obi://config/current resource', () => {
      const result = listResources();

      const configResource = result.resources.find(
        (r) => r.uri === OBI_RESOURCE_URIS.CONFIG_CURRENT
      );

      expect(configResource).toBeDefined();
      expect(configResource?.name).toBe('Current OBI Configuration');
      expect(configResource?.mimeType).toBe('application/json');
      expect(configResource?.description).toContain('configuration');
    });

    it('should include obi://status/health resource', () => {
      const result = listResources();

      const healthResource = result.resources.find(
        (r) => r.uri === OBI_RESOURCE_URIS.STATUS_HEALTH
      );

      expect(healthResource).toBeDefined();
      expect(healthResource?.name).toBe('OBI Process Health');
      expect(healthResource?.mimeType).toBe('application/json');
      expect(healthResource?.description).toContain('health');
    });

    it('should include obi://logs/recent resource', () => {
      const result = listResources();

      const logsResource = result.resources.find(
        (r) => r.uri === OBI_RESOURCE_URIS.LOGS_RECENT
      );

      expect(logsResource).toBeDefined();
      expect(logsResource?.name).toBe('Recent OBI Logs');
      expect(logsResource?.mimeType).toBe('text/plain');
      expect(logsResource?.description).toContain('logs');
    });
  });

  describe('Read Resource: obi://config/current', () => {
    it('should read current configuration when available', async () => {
      const mockConfig = {
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.status_code'],
          cidrs: [
            { cidr: '10.0.0.0/8', name: 'internal' },
            { cidr: '192.168.0.0/16', name: 'private' },
          ],
        },
        export: {
          otlp: {
            endpoint: 'localhost:4317',
            protocol: 'grpc' as const,
          },
        },
      };

      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT);

      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents).toHaveLength(1);

      const content = result.contents[0];
      expect(content.uri).toBe(OBI_RESOURCE_URIS.CONFIG_CURRENT);
      expect(content.mimeType).toBe('application/json');
      expect(content.text).toBeDefined();

      const parsedConfig = JSON.parse(content.text!);
      expect(parsedConfig).toEqual(mockConfig);
      expect(parsedConfig.network.enable).toBe(true);
      expect(parsedConfig.export.otlp.endpoint).toBe('localhost:4317');
    });

    it('should return error message when config not available', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue(null);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(OBI_RESOURCE_URIS.CONFIG_CURRENT);
      expect(result.contents[0].mimeType).toBe('application/json');

      const parsedResponse = JSON.parse(result.contents[0].text!);
      expect(parsedResponse).toHaveProperty('error');
      expect(parsedResponse.error).toBe('No configuration available');
      expect(parsedResponse.message).toContain('OBI has not been deployed');
    });

    it('should handle config read errors', async () => {
      vi.mocked(obiManager.getConfig).mockRejectedValue(new Error('Config file not found'));

      await expect(handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT)).rejects.toThrow(
        'Config file not found'
      );
    });
  });

  describe('Read Resource: obi://status/health', () => {
    it('should read health status when OBI is running', async () => {
      const mockHealth = {
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 3600,
        cpuUsage: 5.2,
        memoryUsage: 150.5,
        configPath: '/home/user/.obi/obi-config.yml',
      };

      vi.mocked(obiManager.getStatus).mockResolvedValue(mockHealth);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(OBI_RESOURCE_URIS.STATUS_HEALTH);
      expect(result.contents[0].mimeType).toBe('application/json');

      const healthData = JSON.parse(result.contents[0].text!);
      expect(healthData.status).toBe(ObiStatus.RUNNING);
      expect(healthData.running).toBe(true);
      expect(healthData.pid).toBe(12345);
      expect(healthData.uptimeSeconds).toBe(3600);
      expect(healthData.cpuUsagePercent).toBe(5.2);
      expect(healthData.memoryUsageMB).toBe(150.5);
      expect(healthData.configPath).toBe('/home/user/.obi/obi-config.yml');
      expect(healthData.timestamp).toBeDefined();
    });

    it('should read health status when OBI is stopped', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.STOPPED,
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);

      const healthData = JSON.parse(result.contents[0].text!);
      expect(healthData.status).toBe(ObiStatus.STOPPED);
      expect(healthData.running).toBe(false);
      expect(healthData.pid).toBeUndefined();
      expect(healthData.timestamp).toBeDefined();
    });

    it('should include error information when status is ERROR', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.ERROR,
        lastError: 'Process crashed unexpectedly',
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);

      const healthData = JSON.parse(result.contents[0].text!);
      expect(healthData.status).toBe(ObiStatus.ERROR);
      expect(healthData.running).toBe(false);
      expect(healthData.lastError).toBe('Process crashed unexpectedly');
    });

    it('should handle status check errors', async () => {
      vi.mocked(obiManager.getStatus).mockRejectedValue(new Error('Process lookup failed'));

      await expect(handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH)).rejects.toThrow(
        'Process lookup failed'
      );
    });

    it('should include all metrics when available', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 9999,
        uptime: 7200,
        cpuUsage: 12.5,
        memoryUsage: 256.0,
        configPath: '/etc/obi/config.yaml',
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);
      const healthData = JSON.parse(result.contents[0].text!);

      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('running');
      expect(healthData).toHaveProperty('pid');
      expect(healthData).toHaveProperty('uptimeSeconds');
      expect(healthData).toHaveProperty('cpuUsagePercent');
      expect(healthData).toHaveProperty('memoryUsageMB');
      expect(healthData).toHaveProperty('configPath');
      expect(healthData).toHaveProperty('timestamp');
    });
  });

  describe('Read Resource: obi://logs/recent', () => {
    it('should read recent logs successfully', async () => {
      const mockLogs = [
        '[2024-01-15 10:00:00] INFO: OBI started successfully',
        '[2024-01-15 10:00:05] DEBUG: eBPF program loaded',
        '[2024-01-15 10:00:10] INFO: Connected to OTLP endpoint',
        '[2024-01-15 10:00:15] WARN: High memory usage detected',
        '[2024-01-15 10:00:20] INFO: Telemetry export active',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT);

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(OBI_RESOURCE_URIS.LOGS_RECENT);
      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(result.contents[0].text).toBeDefined();

      const logText = result.contents[0].text!;
      mockLogs.forEach((logLine) => {
        expect(logText).toContain(logLine);
      });

      expect(obiManager.getLogs).toHaveBeenCalledWith(100);
    });

    it('should return message when no logs available', async () => {
      vi.mocked(obiManager.getLogs).mockResolvedValue([]);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT);

      expect(result.contents[0].text).toBe('No logs available');
    });

    it('should handle log read errors', async () => {
      vi.mocked(obiManager.getLogs).mockRejectedValue(new Error('Log file not accessible'));

      await expect(handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT)).rejects.toThrow(
        'Log file not accessible'
      );
    });

    it('should preserve log formatting', async () => {
      const mockLogs = [
        '[2024-01-15 10:00:00] INFO: Multi-line log entry',
        '  Stack trace:',
        '    at function1 (file1.ts:10)',
        '    at function2 (file2.ts:20)',
        '[2024-01-15 10:00:05] INFO: Next log entry',
      ];

      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT);

      const logText = result.contents[0].text!;
      expect(logText).toContain('Stack trace:');
      expect(logText).toContain('  at function1');
      expect(logText.split('\n')).toHaveLength(mockLogs.length);
    });
  });

  describe('Resource Error Handling', () => {
    it('should reject unknown resource URIs', async () => {
      await expect(handleResourceRead('obi://unknown/resource')).rejects.toThrow(
        'Unknown resource URI'
      );
    });

    it('should reject invalid URI schemes', async () => {
      await expect(handleResourceRead('http://invalid/resource')).rejects.toThrow(
        'Unknown resource URI'
      );
    });

    it('should reject empty URIs', async () => {
      await expect(handleResourceRead('')).rejects.toThrow('Unknown resource URI');
    });

    it('should propagate errors from underlying manager', async () => {
      vi.mocked(obiManager.getStatus).mockRejectedValue(
        new Error('Critical system error')
      );

      await expect(handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH)).rejects.toThrow(
        'Critical system error'
      );
    });
  });

  describe('Resource Content Format', () => {
    it('should return valid JSON for config resource', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue({
        network: { enable: true },
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT);

      expect(() => {
        JSON.parse(result.contents[0].text!);
      }).not.toThrow();
    });

    it('should return valid JSON for health resource', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);

      expect(() => {
        JSON.parse(result.contents[0].text!);
      }).not.toThrow();
    });

    it('should return plain text for logs resource', async () => {
      vi.mocked(obiManager.getLogs).mockResolvedValue(['[INFO] Log entry']);

      const result = await handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT);

      expect(result.contents[0].mimeType).toBe('text/plain');
      expect(typeof result.contents[0].text).toBe('string');
    });

    it('should format JSON with proper indentation', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue({
        network: { enable: true },
        export: { otlp: { endpoint: 'localhost:4317' } },
      });

      const result = await handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT);

      expect(result.contents[0].text).toContain('\n');
      expect(result.contents[0].text).toContain('  ');
    });
  });

  describe('Concurrent Resource Access', () => {
    it('should handle multiple concurrent reads', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue({ network: { enable: true } });
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
      });
      vi.mocked(obiManager.getLogs).mockResolvedValue(['[INFO] Log entry']);

      const [configResult, healthResult, logsResult] = await Promise.all([
        handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT),
        handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH),
        handleResourceRead(OBI_RESOURCE_URIS.LOGS_RECENT),
      ]);

      expect(configResult.contents[0].uri).toBe(OBI_RESOURCE_URIS.CONFIG_CURRENT);
      expect(healthResult.contents[0].uri).toBe(OBI_RESOURCE_URIS.STATUS_HEALTH);
      expect(logsResult.contents[0].uri).toBe(OBI_RESOURCE_URIS.LOGS_RECENT);
    });

    it('should handle partial failures in concurrent access', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue({ network: { enable: true } });
      vi.mocked(obiManager.getStatus).mockRejectedValue(new Error('Status check failed'));

      const results = await Promise.allSettled([
        handleResourceRead(OBI_RESOURCE_URIS.CONFIG_CURRENT),
        handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
    });
  });

  describe('Resource Data Consistency', () => {
    it('should return consistent data format across multiple calls', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
      });

      const result1 = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);
      const result2 = await handleResourceRead(OBI_RESOURCE_URIS.STATUS_HEALTH);

      expect(result1.contents[0]).toHaveProperty('uri');
      expect(result1.contents[0]).toHaveProperty('mimeType');
      expect(result1.contents[0]).toHaveProperty('text');

      expect(result2.contents[0]).toHaveProperty('uri');
      expect(result2.contents[0]).toHaveProperty('mimeType');
      expect(result2.contents[0]).toHaveProperty('text');

      const data1 = JSON.parse(result1.contents[0].text!);
      const data2 = JSON.parse(result2.contents[0].text!);

      expect(data1).toHaveProperty('status');
      expect(data2).toHaveProperty('status');
      expect(data1.status).toBe(data2.status);
    });
  });
});
