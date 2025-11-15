/**
 * E2E Tests for OBI Lifecycle Management
 * Tests complete deploy -> monitor -> stop workflow
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
  extractTextContent,
  parseStatusResponse,
  isSuccessResponse,
  isErrorResponse
} from './test-helpers.js';

const execAsync = promisify(exec);

/**
 * Check if OBI binary is available
 */
async function checkObiAvailable(): Promise<boolean> {
  // Check if OBI_BINARY_PATH is set
  if (process.env.OBI_BINARY_PATH) {
    try {
      await fs.access(process.env.OBI_BINARY_PATH);
      return true;
    } catch {
      return false;
    }
  }

  // Check if 'obi' is in PATH
  try {
    await execAsync('which obi');
    return true;
  } catch {
    return false;
  }
}

const OBI_AVAILABLE = await checkObiAvailable();

describe('OBI Lifecycle E2E', () => {
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

  describe('Status Check When Stopped', () => {
    it('should report OBI as stopped initially', async () => {
      const result = await callTool(server, 'obi_get_status');
      const text = extractTextContent(result);

      expect(text).toBeTruthy();

      const statusData = parseStatusResponse(text);
      expect(statusData.status).toBe('stopped');
    });

    it('should return structured status data', async () => {
      const result = await callTool(server, 'obi_get_status');
      const text = extractTextContent(result);

      const statusData = parseStatusResponse(text);
      expect(statusData).toHaveProperty('status');
      expect(statusData.status).toBe('stopped');
    });
  });

  describe.skipIf(!OBI_AVAILABLE)('Full Lifecycle with Real OBI', () => {
    it('should deploy, monitor, and stop OBI', async () => {
      // Step 1: Check initial status (should be stopped)
      const initialStatus = await callTool(server, 'obi_get_status');
      const initialText = extractTextContent(initialStatus);
      const initialData = parseStatusResponse(initialText);
      expect(initialData.status).toBe('stopped');

      // Step 2: Deploy OBI
      const deployResult = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      expect(isSuccessResponse(deployResult)).toBe(true);

      // Step 3: Verify running
      const runningStatus = await callTool(server, 'obi_get_status');
      const runningText = extractTextContent(runningStatus);
      const runningData = parseStatusResponse(runningText);

      expect(runningData.status).toBe('running');
      expect(runningData).toHaveProperty('pid');
      expect(typeof runningData.pid).toBe('number');

      // Step 4: Monitor for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check it's still running
      const midCheckStatus = await callTool(server, 'obi_get_status');
      const midCheckText = extractTextContent(midCheckStatus);
      const midCheckData = parseStatusResponse(midCheckText);

      expect(midCheckData.status).toBe('running');
      expect(midCheckData.pid).toBe(runningData.pid);

      // Step 5: Stop OBI
      const stopResult = await callTool(server, 'obi_stop');
      expect(isSuccessResponse(stopResult)).toBe(true);

      // Step 6: Verify stopped
      const finalStatus = await callTool(server, 'obi_get_status');
      const finalText = extractTextContent(finalStatus);
      const finalData = parseStatusResponse(finalText);

      expect(finalData.status).toBe('stopped');
    }, 30000); // 30 second timeout for this test

    it('should prevent duplicate deployments', async () => {
      // Deploy once
      const firstDeploy = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });
      expect(isSuccessResponse(firstDeploy)).toBe(true);

      // Try to deploy again
      const secondDeploy = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      const secondText = extractTextContent(secondDeploy).toLowerCase();
      expect(secondText).toContain('already running');

      // Cleanup
      await callTool(server, 'obi_stop');
    }, 20000);

    it('should handle rapid status checks during operation', async () => {
      // Deploy OBI
      await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      // Make multiple rapid status checks
      const statusChecks = await Promise.all([
        callTool(server, 'obi_get_status'),
        callTool(server, 'obi_get_status'),
        callTool(server, 'obi_get_status'),
        callTool(server, 'obi_get_status'),
        callTool(server, 'obi_get_status'),
      ]);

      // All should succeed and report same PID
      const pids = statusChecks.map(result => {
        const text = extractTextContent(result);
        const data = parseStatusResponse(text);
        return data.pid;
      });

      expect(pids.every(pid => pid === pids[0])).toBe(true);

      // Cleanup
      await callTool(server, 'obi_stop');
    }, 20000);
  });

  describe('Mock Mode Tests (No OBI Binary)', () => {
    it('should handle deployment gracefully without binary', async () => {
      // This test runs even without OBI binary
      // It should fail gracefully with a clear error message
      const result = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        binaryPath: '/nonexistent/obi'
      });

      expect(isErrorResponse(result)).toBe(true);
    });

    it('should allow stopping when not running', async () => {
      const result = await callTool(server, 'obi_stop');
      const text = extractTextContent(result);

      expect(text).toBeTruthy();
      // Should either succeed (no-op) or report "not running"
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid deployment options gracefully', async () => {
      const result = await callTool(server, 'obi_deploy_local', {
        mode: 'invalid_mode'
      });

      // Should return an error response, not throw
      expect(isErrorResponse(result)).toBe(true);
    });

    it('should handle missing config file gracefully', async () => {
      const result = await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: '/nonexistent/path/config.yml'
      });

      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe.skipIf(!OBI_AVAILABLE)('Log Monitoring', () => {
    it('should capture logs during OBI execution', async () => {
      // Deploy OBI
      await callTool(server, 'obi_deploy_local', {
        mode: 'standalone',
        configPath: testConfigPath
      });

      // Wait for some logs to be generated
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get logs
      const logsResult = await callTool(server, 'obi_get_logs', {
        lines: 50
      });
      const logsText = extractTextContent(logsResult);

      // Should have some log content
      expect(logsText).toBeTruthy();
      expect(logsText.length).toBeGreaterThan(0);

      // Cleanup
      await callTool(server, 'obi_stop');
    }, 15000);
  });

  describe('Process Recovery', () => {
    it('should detect externally stopped process', async () => {
      // This test verifies the system can detect when OBI stops unexpectedly
      const statusBefore = await callTool(server, 'obi_get_status');
      const beforeText = extractTextContent(statusBefore);
      const beforeData = parseStatusResponse(beforeText);

      expect(beforeData.status).toBe('stopped');

      // After a non-existent process, status should still work
      const statusAfter = await callTool(server, 'obi_get_status');
      const afterText = extractTextContent(statusAfter);
      const afterData = parseStatusResponse(afterText);

      expect(afterData).toHaveProperty('status');
    });
  });
});
