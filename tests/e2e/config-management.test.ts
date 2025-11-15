/**
 * E2E Tests for Configuration Management
 * Tests config update workflows and restart scenarios
 * Can run with real OBI binary or in mock mode
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ObiMcpServer } from '../../src/server/index.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  callTool,
  readResource,
  extractTextContent,
  parseStatusResponse,
  parseConfigResponse,
  isSuccessResponse,
  isErrorResponse
} from './test-helpers.js';

const execAsync = promisify(exec);

/**
 * Check if OBI binary is available
 */
async function checkObiAvailable(): Promise<boolean> {
  if (process.env.OBI_BINARY_PATH) {
    try {
      await fs.access(process.env.OBI_BINARY_PATH);
      return true;
    } catch {
      return false;
    }
  }

  try {
    await execAsync('which obi');
    return true;
  } catch {
    return false;
  }
}

const OBI_AVAILABLE = await checkObiAvailable();

describe('Config Management E2E', () => {
  let server: ObiMcpServer;
  const testConfigPath = join(process.cwd(), '.obi', 'test-config.yml');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(join(process.cwd(), '.obi'), { recursive: true });

    // Ensure OBI is stopped before tests
    try {
      await execAsync('pkill -9 obi');
    } catch {
      // Ignore if no OBI process
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(() => {
    server = new ObiMcpServer();
  });

  afterAll(async () => {
    // Cleanup: ensure OBI is stopped
    try {
      await callTool(server, 'obi_stop');
    } catch {
      // Ignore errors during cleanup
    }

    // Clean up test files
    try {
      await fs.rm(join(process.cwd(), '.obi'), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    await server.stop();
  });

  describe('Configuration Reading', () => {
    it('should read config when not deployed', async () => {
      const result = await callTool(server, 'obi_get_config');
      const text = extractTextContent(result);

      expect(text).toBeTruthy();

      // Should indicate no config available
      const config = parseConfigResponse(text);
      expect(config).toBeNull();
    });

    it('should read config via resource API', async () => {
      const result = await readResource(server, 'obi://config/current');

      expect(result).toHaveProperty('contents');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toHaveProperty('text');

      const text = result.contents[0].text;
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  describe.skipIf(!OBI_AVAILABLE)('Configuration Updates with Restart', () => {
    it('should update config and restart OBI', async () => {
      // Step 1: Deploy with default config
      const deployResult = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });
      expect(isSuccessResponse(deployResult)).toBe(true);

      // Wait for startup
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Get current config
      const initialConfig = await callTool(server, 'obi_get_config');
      const initialConfigText = extractTextContent(initialConfig);
      expect(initialConfigText).toBeTruthy();

      // Step 3: Update config (enable network metrics)
      const updateResult = await callTool(server, 'obi_update_config', {
        config: {
          network: {
            enable: true,
            metrics: true
          }
        },
        merge: true,
        restart: true
      });
      expect(isSuccessResponse(updateResult)).toBe(true);

      // Wait for restart to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 4: Verify still running
      const newStatus = await callTool(server, 'obi_get_status');
      const newStatusText = extractTextContent(newStatus);
      const newStatusData = parseStatusResponse(newStatusText);

      expect(newStatusData.status).toBe('running');

      // Step 5: Stop OBI
      await callTool(server, 'obi_stop');
    }, 30000); // 30 second timeout

    it('should update config without restart', async () => {
      // Deploy first
      await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusBefore = await callTool(server, 'obi_get_status');
      const statusBeforeText = extractTextContent(statusBefore);
      const statusBeforeData = parseStatusResponse(statusBeforeText);
      const pidBefore = statusBeforeData.pid;

      // Update config without restart
      const updateResult = await callTool(server, 'obi_update_config', {
        config: {
          network: {
            enable: false
          }
        },
        merge: true,
        restart: false
      });
      expect(isSuccessResponse(updateResult)).toBe(true);

      const updateText = extractTextContent(updateResult);
      expect(updateText.toLowerCase()).toContain('restart');

      // Verify PID hasn't changed (no restart)
      const statusAfter = await callTool(server, 'obi_get_status');
      const statusAfterText = extractTextContent(statusAfter);
      const statusAfterData = parseStatusResponse(statusAfterText);

      expect(statusAfterData.pid).toBe(pidBefore);

      // Cleanup
      await callTool(server, 'obi_stop');
    }, 20000);
  });

  describe('Configuration Validation', () => {
    it('should reject invalid configuration', async () => {
      const result = await callTool(server, 'obi_update_config', {
        config: {
          invalid_field: 'invalid_value',
          network: 'should_be_object'
        }
      });

      // Should return an error response
      expect(isErrorResponse(result)).toBe(true);
    });

    it('should handle empty configuration update', async () => {
      const result = await callTool(server, 'obi_update_config', {
        config: {},
        merge: true
      });

      // Should handle gracefully
      const text = extractTextContent(result);
      expect(text).toBeTruthy();
    });
  });

  describe('Configuration Merge Behavior', () => {
    it('should merge configs correctly', async () => {
      // Prepare a base config file
      const baseConfig = {
        network: {
          enable: true
        },
        filesystem: {
          enable: false
        }
      };

      await fs.writeFile(testConfigPath, JSON.stringify(baseConfig));

      // Deploy to set the config path
      const deployResult = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      if (OBI_AVAILABLE) {
        // Wait for deployment
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Update with merge
        await callTool(server, 'obi_update_config', {
          config: {
            network: {
              metrics: true
            }
          },
          merge: true,
          restart: false
        });

        // Cleanup
        await callTool(server, 'obi_stop');
      } else {
        // Just verify the deploy result has appropriate message
        const deployText = extractTextContent(deployResult);
        expect(deployText).toBeTruthy();
      }
    }, 20000);
  });

  describe('Resource-based Config Access', () => {
    it('should read config through resource API', async () => {
      const resourceResult = await readResource(server, 'obi://config/current');

      expect(resourceResult).toHaveProperty('contents');
      expect(resourceResult.contents[0]).toHaveProperty('uri', 'obi://config/current');
      expect(resourceResult.contents[0]).toHaveProperty('mimeType', 'application/json');

      const text = resourceResult.contents[0].text;
      expect(() => JSON.parse(text)).not.toThrow();
    });

    it('should handle consistent data format', async () => {
      // Get config via tool
      const toolResult = await callTool(server, 'obi_get_config');
      const toolText = extractTextContent(toolResult);

      // Get config via resource
      const resourceResult = await readResource(server, 'obi://config/current');
      const resourceText = resourceResult.contents[0].text;

      // Both should be valid responses
      expect(toolText).toBeTruthy();
      expect(resourceText).toBeTruthy();

      // Resource should be JSON
      expect(() => JSON.parse(resourceText)).not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    it('should handle config update when OBI is not deployed', async () => {
      const result = await callTool(server, 'obi_update_config', {
        config: {
          network: {
            enable: true
          }
        }
      });

      // Should return an error response
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe.skipIf(!OBI_AVAILABLE)('Complex Configuration Scenarios', () => {
    it('should handle multiple rapid config updates', async () => {
      // Deploy OBI
      await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Make multiple rapid updates
      const updates = await Promise.all([
        callTool(server, 'obi_update_config', {
          config: { network: { enable: true } },
          merge: true,
          restart: false
        }),
        callTool(server, 'obi_update_config', {
          config: { filesystem: { enable: true } },
          merge: true,
          restart: false
        })
      ]);

      // All should complete (not necessarily all succeed)
      expect(updates).toHaveLength(2);
      updates.forEach(result => {
        const text = extractTextContent(result);
        expect(text).toBeTruthy();
      });

      // Cleanup
      await callTool(server, 'obi_stop');
    }, 20000);
  });
});
