/**
 * Unit tests for obi_deploy_local tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDeployLocalTool, handleDeployLocal } from '../../../src/tools/deploy-local.js';
import obiManager from '../../../src/utils/obi-manager.js';
import { ObiDeploymentMode } from '../../../src/types/obi.js';

// Mock obiManager
vi.mock('../../../src/utils/obi-manager.js', () => ({
  default: {
    deployLocal: vi.fn(),
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

describe('obi_deploy_local tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool definition', () => {
    it('should have correct name', () => {
      expect(getDeployLocalTool.name).toBe('obi_deploy_local');
    });

    it('should have description', () => {
      expect(getDeployLocalTool.description).toBeTruthy();
      expect(getDeployLocalTool.description.length).toBeGreaterThan(10);
    });

    it('should have valid input schema', () => {
      expect(getDeployLocalTool.inputSchema).toBeDefined();
      expect(getDeployLocalTool.inputSchema.type).toBe('object');
      expect(getDeployLocalTool.inputSchema.properties).toBeDefined();
    });

    it('should accept config parameter', () => {
      expect(getDeployLocalTool.inputSchema.properties?.config).toBeDefined();
      expect(getDeployLocalTool.inputSchema.properties?.config.type).toBe('object');
    });

    it('should accept configPath parameter', () => {
      expect(getDeployLocalTool.inputSchema.properties?.configPath).toBeDefined();
      expect(getDeployLocalTool.inputSchema.properties?.configPath.type).toBe('string');
    });

    it('should accept binaryPath parameter', () => {
      expect(getDeployLocalTool.inputSchema.properties?.binaryPath).toBeDefined();
      expect(getDeployLocalTool.inputSchema.properties?.binaryPath.type).toBe('string');
    });
  });

  describe('handleDeployLocal', () => {
    it('should handle successful deployment with config object', async () => {
      const mockResult = {
        success: true,
        message: 'OBI deployed successfully with PID 12345',
        data: {
          pid: 12345,
          configPath: '/path/to/config.yml',
          logPath: '/path/to/obi.log',
        },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const config = {
        network: { enable: true },
      };

      const result = await handleDeployLocal({ config });

      expect(result.content).toBeDefined();
      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('SUCCESS');
      expect(result.content[0].text).toContain('12345');
      expect(result.isError).toBeFalsy();
      expect(obiManager.deployLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ObiDeploymentMode.STANDALONE,
          config,
        })
      );
    });

    it('should handle successful deployment with configPath', async () => {
      const mockResult = {
        success: true,
        message: 'OBI deployed successfully',
        data: {
          pid: 54321,
          configPath: '/custom/config.yml',
        },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({ configPath: '/custom/config.yml' });

      expect(result.content[0].text).toContain('SUCCESS');
      expect(result.isError).toBeFalsy();
      expect(obiManager.deployLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ObiDeploymentMode.STANDALONE,
          configPath: '/custom/config.yml',
        })
      );
    });

    it('should handle successful deployment with custom binaryPath', async () => {
      const mockResult = {
        success: true,
        message: 'OBI deployed successfully',
        data: { pid: 99999 },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({
        config: { network: { enable: true } },
        binaryPath: '/usr/local/bin/obi',
      });

      expect(result.content[0].text).toContain('SUCCESS');
      expect(result.isError).toBeFalsy();
      expect(obiManager.deployLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          binaryPath: '/usr/local/bin/obi',
        })
      );
    });

    it('should handle deployment failure', async () => {
      const mockResult = {
        success: false,
        message: 'OBI is already running',
        error: 'Process already exists',
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({ config: { network: { enable: true } } });

      expect(result.content[0].text).toContain('FAILED');
      expect(result.content[0].text).toContain('already running');
      expect(result.isError).toBe(true);
    });

    it('should handle deployment exception', async () => {
      vi.mocked(obiManager.deployLocal).mockRejectedValue(new Error('Failed to start OBI'));

      const result = await handleDeployLocal({ config: { network: { enable: true } } });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Failed to start OBI');
      expect(result.isError).toBe(true);
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(obiManager.deployLocal).mockRejectedValue('String error');

      const result = await handleDeployLocal({ config: { network: { enable: true } } });

      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('String error');
      expect(result.isError).toBe(true);
    });

    it('should handle deployment with both config and configPath', async () => {
      const mockResult = {
        success: true,
        message: 'OBI deployed successfully',
        data: { pid: 12345 },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const config = { network: { enable: true } };
      const result = await handleDeployLocal({
        config,
        configPath: '/custom/config.yml',
      });

      expect(result.isError).toBeFalsy();
      expect(obiManager.deployLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          config,
          configPath: '/custom/config.yml',
        })
      );
    });

    it('should include error details when deployment fails', async () => {
      const mockResult = {
        success: false,
        message: 'Deployment failed',
        error: 'Binary not found in PATH',
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({ config: { network: { enable: true } } });

      expect(result.content[0].text).toContain('Binary not found in PATH');
      expect(result.isError).toBe(true);
    });

    it('should format response with all deployment data', async () => {
      const mockResult = {
        success: true,
        message: 'Deployed successfully',
        data: {
          pid: 12345,
          configPath: '/path/to/config.yml',
        },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({ config: { network: { enable: true } } });

      expect(result.content[0].text).toContain('12345');
      expect(result.content[0].text).toContain('/path/to/config.yml');
    });

    it('should validate empty args', async () => {
      const mockResult = {
        success: true,
        message: 'Deployed with defaults',
        data: { pid: 11111 },
      };

      vi.mocked(obiManager.deployLocal).mockResolvedValue(mockResult);

      const result = await handleDeployLocal({});

      expect(result.isError).toBeFalsy();
      expect(obiManager.deployLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: ObiDeploymentMode.STANDALONE,
        })
      );
    });

    it('should handle invalid argument types gracefully', async () => {
      const result = await handleDeployLocal({ config: 'invalid' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });
});
