/**
 * Unit tests for obi_update_config tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateConfigTool, handleUpdateConfig } from '../../../src/tools/update-config.js';
import obiManager from '../../../src/utils/obi-manager.js';

// Mock obiManager
vi.mock('../../../src/utils/obi-manager.js', () => ({
  default: {
    updateConfig: vi.fn(),
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

describe('obi_update_config tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(updateConfigTool.name).toBe('obi_update_config');
    });

    it('should have description', () => {
      expect(updateConfigTool.description).toBeTruthy();
      expect(updateConfigTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(updateConfigTool.inputSchema).toBeDefined();
      expect(updateConfigTool.inputSchema.type).toBe('object');
      expect(updateConfigTool.inputSchema.properties).toBeDefined();
    });

    it('should require config parameter', () => {
      expect(updateConfigTool.inputSchema.required).toContain('config');
    });

    it('should accept merge parameter', () => {
      expect(updateConfigTool.inputSchema.properties?.merge).toBeDefined();
      expect(updateConfigTool.inputSchema.properties?.merge.type).toBe('boolean');
      expect(updateConfigTool.inputSchema.properties?.merge.default).toBe(true);
    });

    it('should accept restart parameter', () => {
      expect(updateConfigTool.inputSchema.properties?.restart).toBeDefined();
      expect(updateConfigTool.inputSchema.properties?.restart.type).toBe('boolean');
      expect(updateConfigTool.inputSchema.properties?.restart.default).toBe(false);
    });
  });

  describe('handleUpdateConfig', () => {
    it('should handle successful config update with merge=true', async () => {
      const mockResult = {
        success: true,
        message: 'Config updated successfully',
        data: {
          network: { enable: true },
          export: { otlp: { endpoint: 'http://localhost:4318' } },
        },
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config, merge: true, restart: false });

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Success');
      expect(result.content[0].text).toContain('Restart OBI for changes to take effect');
      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, true, false);
    });

    it('should handle successful config update with merge=false', async () => {
      const mockResult = {
        success: true,
        message: 'Config replaced successfully',
        data: { network: { enable: false } },
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: false } };
      const result = await handleUpdateConfig({ config, merge: false });

      expect(result.content[0].text).toContain('Success');
      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, false, false);
    });

    it('should handle config update with restart=true', async () => {
      const mockResult = {
        success: true,
        message: 'Config updated and OBI restarted',
        data: { network: { enable: true } },
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config, restart: true });

      expect(result.content[0].text).toContain('Success');
      expect(result.content[0].text).toContain('restarted');
      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, true, true);
    });

    it('should handle config update failure', async () => {
      const mockResult = {
        success: false,
        message: 'No config path set',
        error: 'OBI has not been deployed yet',
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('No config path set');
      expect(result.content[0].text).toContain('not been deployed');
      expect(result.isError).toBe(true);
    });

    it('should handle invalid config schema', async () => {
      // Invalid config with wrong types should fail schema validation
      const invalidConfig = { network: { enable: 'not-a-boolean' } };
      const result = await handleUpdateConfig({ config: invalidConfig });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Invalid configuration');
      expect(result.isError).toBe(true);
      // obiManager should not be called if schema validation fails
      expect(obiManager.updateConfig).not.toHaveBeenCalled();
    });

    it('should handle exception during update', async () => {
      vi.mocked(obiManager.updateConfig).mockRejectedValue(
        new Error('Failed to write config file')
      );

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to write config file');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.updateConfig).mockRejectedValue('String error');

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should use default values for optional parameters', async () => {
      const mockResult = {
        success: true,
        message: 'Config updated',
        data: {},
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config });

      expect(result.isError).toBeFalsy();
      // Default merge=true, restart=false
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, true, false);
    });

    it('should include updated config in response', async () => {
      const updatedConfig = {
        network: { enable: true, allowed_attributes: ['http.method'] },
        export: { otlp: { endpoint: 'http://collector:4318' } },
      };

      const mockResult = {
        success: true,
        message: 'Config updated',
        data: updatedConfig,
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleUpdateConfig({ config });

      expect(result.content[0].text).toContain('Updated Configuration');
      expect(result.content[0].text).toContain('http.method');
      expect(result.content[0].text).toContain('collector:4318');
    });

    it('should handle complex nested config update', async () => {
      const mockResult = {
        success: true,
        message: 'Config updated',
        data: {},
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = {
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.status_code'],
          cidrs: [{ cidr: '10.0.0.0/8', name: 'private' }],
        },
        attributes: {
          kubernetes: { enable: true },
        },
        export: {
          otlp: {
            endpoint: 'http://localhost:4318',
            protocol: 'http/protobuf',
          },
        },
      };

      const result = await handleUpdateConfig({ config });

      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, true, false);
    });

    it('should validate missing required config parameter', async () => {
      const result = await handleUpdateConfig({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });

    it('should handle partial config for merge', async () => {
      const mockResult = {
        success: true,
        message: 'Config merged',
        data: {},
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      // Only updating network settings
      const partialConfig = {
        network: { enable: false },
      };

      const result = await handleUpdateConfig({ config: partialConfig, merge: true });

      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(partialConfig, true, false);
    });

    it('should handle boolean parameter coercion', async () => {
      const mockResult = {
        success: true,
        message: 'Config updated',
        data: {},
      };

      vi.mocked(obiManager.updateConfig).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };

      // Test with explicit boolean values
      const result = await handleUpdateConfig({
        config,
        merge: false,
        restart: true,
      });

      expect(result.isError).toBeFalsy();
      expect(obiManager.updateConfig).toHaveBeenCalledWith(config, false, true);
    });
  });
});
