/**
 * Unit tests for obi_get_config tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConfigTool, handleGetConfig } from '../../../src/tools/get-config.js';
import obiManager from '../../../src/utils/obi-manager.js';

// Mock obiManager
vi.mock('../../../src/utils/obi-manager.js', () => ({
  default: {
    getConfig: vi.fn(),
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

describe('obi_get_config tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getConfigTool.name).toBe('obi_get_config');
    });

    it('should have description', () => {
      expect(getConfigTool.description).toBeTruthy();
      expect(getConfigTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(getConfigTool.inputSchema).toBeDefined();
      expect(getConfigTool.inputSchema.type).toBe('object');
      expect(getConfigTool.inputSchema.properties).toBeDefined();
    });

    it('should have empty properties (no arguments needed)', () => {
      expect(Object.keys(getConfigTool.inputSchema.properties || {})).toHaveLength(0);
    });
  });

  describe('handleGetConfig', () => {
    it('should handle successful config retrieval', async () => {
      const mockConfig = {
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.status_code'],
        },
        export: {
          otlp: {
            endpoint: 'http://localhost:4318',
            protocol: 'http/protobuf',
          },
        },
      };

      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({});

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('OBI Configuration');
      expect(result.content[0].text).toContain('network');
      expect(result.content[0].text).toContain('http.method');
      expect(result.isError).toBeFalsy();
    });

    it('should handle null config (not deployed)', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue(null);

      const result = await handleGetConfig({});

      expect(result.content[0].text).toContain('No OBI configuration available');
      expect(result.content[0].text).toContain('not been deployed');
      expect(result.isError).toBeFalsy();
    });

    it('should format config as JSON', async () => {
      const mockConfig = {
        network: { enable: true },
        attributes: { kubernetes: { enable: false } },
      };

      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({});

      const parsedConfig = JSON.parse(
        result.content[0].text.replace('=== OBI Configuration ===\n\n', '')
      );
      expect(parsedConfig).toEqual(mockConfig);
    });

    it('should handle error when retrieving config', async () => {
      vi.mocked(obiManager.getConfig).mockRejectedValue(new Error('Failed to read config file'));

      const result = await handleGetConfig({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to read config file');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.getConfig).mockRejectedValue('String error');

      const result = await handleGetConfig({});

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should handle complex nested config', async () => {
      const mockConfig = {
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.url'],
          cidrs: [
            { cidr: '10.0.0.0/8', name: 'private' },
            { cidr: '192.168.0.0/16', name: 'local' },
          ],
        },
        attributes: {
          kubernetes: { enable: true },
        },
        export: {
          otlp: {
            endpoint: 'http://otel-collector:4318',
            protocol: 'http/protobuf',
          },
        },
      };

      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({});

      expect(result.content[0].text).toContain('10.0.0.0/8');
      expect(result.content[0].text).toContain('otel-collector');
      expect(result.isError).toBeFalsy();
    });

    it('should handle empty config object', async () => {
      vi.mocked(obiManager.getConfig).mockResolvedValue({});

      const result = await handleGetConfig({});

      expect(result.content[0].text).toContain('OBI Configuration');
      expect(result.content[0].text).toContain('{}');
      expect(result.isError).toBeFalsy();
    });

    it('should validate empty arguments', async () => {
      const mockConfig = { network: { enable: true } };
      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({});

      expect(result.isError).toBeFalsy();
      expect(obiManager.getConfig).toHaveBeenCalled();
    });

    it('should ignore extra arguments gracefully', async () => {
      const mockConfig = { network: { enable: true } };
      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({ extraParam: 'ignored' });

      expect(result.isError).toBeFalsy();
      expect(obiManager.getConfig).toHaveBeenCalled();
    });

    it('should pretty-print JSON with proper indentation', async () => {
      const mockConfig = {
        network: { enable: true },
      };

      vi.mocked(obiManager.getConfig).mockResolvedValue(mockConfig);

      const result = await handleGetConfig({});

      // Should have indentation (2 spaces)
      expect(result.content[0].text).toMatch(/\n\s{2}/);
    });
  });
});
