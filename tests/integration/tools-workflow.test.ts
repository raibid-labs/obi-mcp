/**
 * Integration Tests for Tool Workflows
 * Tests realistic multi-step tool usage scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDeployLocal } from '../../src/tools/deploy-local.js';
import { handleGetStatus } from '../../src/tools/status.js';
import { handleGetConfig } from '../../src/tools/get-config.js';
import { handleUpdateConfig } from '../../src/tools/update-config.js';
import { handleGetLogs } from '../../src/tools/get-logs.js';
import { handleStop } from '../../src/tools/stop.js';
import obiManager from '../../src/utils/obi-manager.js';
import { ObiStatus } from '../../src/types/obi.js';

// Mock ObiManager
vi.mock('../../src/utils/obi-manager.js', () => {
  const mockManager = {
    getStatus: vi.fn(),
    deployLocal: vi.fn(),
    stop: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getLogs: vi.fn(),
  };
  return {
    default: mockManager,
  };
});

describe('Tool Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workflow: Deploy OBI → Get Status → Get Config', () => {
    it('should deploy OBI, check status, and retrieve config', async () => {
      // Step 1: Deploy OBI
      vi.mocked(obiManager.deployLocal).mockResolvedValue({
        success: true,
        message: 'OBI deployed successfully with PID 12345',
        data: {
          pid: 12345,
          configPath: '/home/user/.obi/obi-config.yml',
          logPath: '/home/user/.obi/obi.log',
        },
      });

      const deployResult = await handleDeployLocal({
        config: {
          network: { enable: true },
        },
      });

      expect(deployResult.isError).toBeFalsy();
      expect(deployResult.content[0].text).toContain('SUCCESS');
      expect(deployResult.content[0].text).toContain('12345');
      expect(obiManager.deployLocal).toHaveBeenCalledWith({
        mode: 'standalone',
        config: { network: { enable: true } },
      });

      // Step 2: Get Status
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 10,
        cpuUsage: 2.5,
        memoryUsage: 120.0,
        configPath: '/home/user/.obi/obi-config.yml',
      });

      const statusResult = await handleGetStatus({ verbose: true });

      expect(statusResult.isError).toBeFalsy();
      expect(statusResult.content[0].text).toContain('Status: running');
      expect(statusResult.content[0].text).toContain('PID: 12345');
      expect(statusResult.content[0].text).toContain('CPU Usage: 2.50%');
      expect(obiManager.getStatus).toHaveBeenCalledWith(true);

      // Step 3: Get Config
      vi.mocked(obiManager.getConfig).mockResolvedValue({
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.status_code'],
        },
      });

      const configResult = await handleGetConfig({});

      expect(configResult.isError).toBeFalsy();
      expect(configResult.content[0].text).toContain('network');
      expect(configResult.content[0].text).toContain('"enable"');
      expect(obiManager.getConfig).toHaveBeenCalled();
    });

    it('should handle deployment failure gracefully', async () => {
      vi.mocked(obiManager.deployLocal).mockResolvedValue({
        success: false,
        message: 'OBI process failed to start',
        error: 'Process terminated shortly after start',
      });

      const deployResult = await handleDeployLocal({
        config: { network: { enable: true } },
      });

      expect(deployResult.isError).toBe(true);
      expect(deployResult.content[0].text).toContain('FAILED');
      expect(deployResult.content[0].text).toContain('Process terminated shortly after start');
    });
  });

  describe('Workflow: Update Config → Restart → Verify Changes', () => {
    it('should update config with restart and verify changes', async () => {
      // Step 1: Update Config with restart
      vi.mocked(obiManager.updateConfig).mockResolvedValue({
        success: true,
        message: 'Config updated and OBI restarted',
        data: {
          network: {
            enable: true,
            allowed_attributes: ['http.method', 'http.status_code', 'net.peer.name'],
          },
        },
      });

      const updateResult = await handleUpdateConfig({
        config: {
          network: {
            allowed_attributes: ['http.method', 'http.status_code', 'net.peer.name'],
          },
        },
        merge: true,
        restart: true,
      });

      expect(updateResult.isError).toBeFalsy();
      expect(updateResult.content[0].text).toContain('Success');
      expect(updateResult.content[0].text).toContain('restarted');

      // Verify the call was made with correct parameters
      // Note: Zod schema may add defaults like enable: true
      const call = vi.mocked(obiManager.updateConfig).mock.calls[0];
      expect(call[1]).toBe(true); // merge
      expect(call[2]).toBe(true); // restart
      expect(call[0].network?.allowed_attributes).toEqual([
        'http.method',
        'http.status_code',
        'net.peer.name',
      ]);

      // Step 2: Verify Status after restart
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12346, // New PID after restart
        uptime: 5,
      });

      const statusResult = await handleGetStatus({});

      expect(statusResult.isError).toBeFalsy();
      expect(statusResult.content[0].text).toContain('Status: running');
      expect(statusResult.content[0].text).toContain('PID: 12346');

      // Step 3: Verify config changes
      vi.mocked(obiManager.getConfig).mockResolvedValue({
        network: {
          enable: true,
          allowed_attributes: ['http.method', 'http.status_code', 'net.peer.name'],
        },
      });

      const configResult = await handleGetConfig({});

      expect(configResult.isError).toBeFalsy();
      expect(configResult.content[0].text).toContain('net.peer.name');
    });

    it('should update config without restart', async () => {
      vi.mocked(obiManager.updateConfig).mockResolvedValue({
        success: true,
        message: 'Config updated (restart required for changes to take effect)',
        data: {
          network: { enable: true },
        },
      });

      const updateResult = await handleUpdateConfig({
        config: { network: { enable: false } },
        merge: true,
        restart: false,
      });

      expect(updateResult.isError).toBeFalsy();
      expect(updateResult.content[0].text).toContain('Restart');
      expect(obiManager.updateConfig).toHaveBeenCalledWith(
        { network: { enable: false } },
        true,
        false
      );
    });

    it('should handle config update failure', async () => {
      vi.mocked(obiManager.updateConfig).mockResolvedValue({
        success: false,
        message: 'Failed to update config',
        error: 'Invalid configuration schema',
      });

      const updateResult = await handleUpdateConfig({
        config: { invalid: 'config' },
      });

      expect(updateResult.isError).toBe(true);
      expect(updateResult.content[0].text).toContain('Error');
      expect(updateResult.content[0].text).toContain('Invalid');
    });
  });

  describe('Workflow: Get Logs → Filter by Level', () => {
    it('should retrieve logs with different filters', async () => {
      const mockLogs = [
        '[2024-01-15 10:00:00] INFO: OBI started successfully',
        '[2024-01-15 10:00:05] DEBUG: eBPF program loaded',
        '[2024-01-15 10:00:10] WARN: High memory usage detected',
        '[2024-01-15 10:00:15] ERROR: Failed to connect to OTLP endpoint',
        '[2024-01-15 10:00:20] INFO: Telemetry export resumed',
      ];

      // Step 1: Get all logs
      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs);

      const allLogsResult = await handleGetLogs({ lines: 100, level: 'all' });

      expect(allLogsResult.isError).toBeFalsy();
      expect(allLogsResult.content[0].text).toContain('INFO');
      expect(allLogsResult.content[0].text).toContain('DEBUG');
      expect(allLogsResult.content[0].text).toContain('WARN');
      expect(allLogsResult.content[0].text).toContain('ERROR');
      expect(obiManager.getLogs).toHaveBeenCalledWith(100);

      // Step 2: Get error logs only
      const errorLogsResult = await handleGetLogs({ lines: 100, level: 'error' });

      expect(errorLogsResult.isError).toBeFalsy();
      expect(errorLogsResult.content[0].text).toContain('ERROR');
      expect(errorLogsResult.content[0].text).not.toContain('INFO: OBI started');

      // Step 3: Get last 10 lines
      vi.mocked(obiManager.getLogs).mockResolvedValue(mockLogs.slice(-2));

      const recentLogsResult = await handleGetLogs({ lines: 10 });

      expect(recentLogsResult.isError).toBeFalsy();
      expect(obiManager.getLogs).toHaveBeenCalledWith(10);
    });

    it('should handle empty logs', async () => {
      vi.mocked(obiManager.getLogs).mockResolvedValue([]);

      const logsResult = await handleGetLogs({ lines: 100 });

      expect(logsResult.isError).toBeFalsy();
      expect(logsResult.content[0].text).toContain('No logs available');
    });

    it('should handle log retrieval error', async () => {
      vi.mocked(obiManager.getLogs).mockResolvedValue(['Error reading logs: File not found']);

      const logsResult = await handleGetLogs({});

      expect(logsResult.content[0].text).toContain('Error reading logs');
    });
  });

  describe('Workflow: Stop OBI → Verify Stopped', () => {
    it('should stop OBI and verify status', async () => {
      // Step 1: Stop OBI
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: true,
        message: 'OBI stopped successfully',
      });

      const stopResult = await handleStop({ force: false });

      expect(stopResult.isError).toBeFalsy();
      expect(stopResult.content[0].text).toContain('Success');
      expect(stopResult.content[0].text).toContain('stopped successfully');
      expect(obiManager.stop).toHaveBeenCalled();

      // Step 2: Verify stopped status
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.STOPPED,
      });

      const statusResult = await handleGetStatus({});

      expect(statusResult.isError).toBeFalsy();
      expect(statusResult.content[0].text).toContain('Status: stopped');
    });

    it('should handle stop when OBI is not running', async () => {
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: false,
        message: 'OBI is not running',
      });

      const stopResult = await handleStop({});

      // Note: "not running" is not marked as error by the handler
      expect(stopResult.isError).toBeFalsy();
      expect(stopResult.content[0].text).toContain('Not Running');
    });

    it('should handle force stop', async () => {
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: true,
        message: 'OBI stopped successfully',
      });

      const stopResult = await handleStop({ force: true });

      expect(stopResult.isError).toBeFalsy();
      expect(stopResult.content[0].text).toContain('Success');
    });
  });

  describe('Workflow: Full Lifecycle', () => {
    it('should complete full OBI lifecycle: deploy → configure → monitor → stop', async () => {
      // Step 1: Deploy
      vi.mocked(obiManager.deployLocal).mockResolvedValue({
        success: true,
        message: 'OBI deployed successfully with PID 12345',
        data: { pid: 12345, configPath: '/tmp/obi-config.yml' },
      });

      const deployResult = await handleDeployLocal({
        config: { network: { enable: true } },
      });

      expect(deployResult.isError).toBeFalsy();
      expect(deployResult.content[0].text).toContain('SUCCESS');

      // Step 2: Check initial status
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 10,
      });

      const initialStatus = await handleGetStatus({ verbose: true });
      expect(initialStatus.isError).toBeFalsy();
      expect(initialStatus.content[0].text).toContain('running');

      // Step 3: Update configuration
      vi.mocked(obiManager.updateConfig).mockResolvedValue({
        success: true,
        message: 'Config updated and OBI restarted',
        data: {
          network: { enable: true },
          export: {
            otlp: { endpoint: 'localhost:4317', protocol: 'grpc' },
          },
        },
      });

      const updateResult = await handleUpdateConfig({
        config: {
          export: {
            otlp: { endpoint: 'localhost:4317', protocol: 'grpc' },
          },
        },
        merge: true,
        restart: true,
      });

      expect(updateResult.isError).toBeFalsy();

      // Step 4: Monitor logs
      vi.mocked(obiManager.getLogs).mockResolvedValue([
        '[INFO] OBI restarted',
        '[INFO] Connected to OTLP endpoint',
        '[INFO] Telemetry export active',
      ]);

      const logsResult = await handleGetLogs({ lines: 50 });
      expect(logsResult.isError).toBeFalsy();
      expect(logsResult.content[0].text).toContain('Connected to OTLP endpoint');

      // Step 5: Final status check
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12346,
        uptime: 30,
        cpuUsage: 3.0,
        memoryUsage: 140.0,
      });

      const finalStatus = await handleGetStatus({ verbose: true });
      expect(finalStatus.isError).toBeFalsy();
      expect(finalStatus.content[0].text).toContain('running');

      // Step 6: Stop OBI
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: true,
        message: 'OBI stopped successfully',
      });

      const stopResult = await handleStop({});
      expect(stopResult.isError).toBeFalsy();
      expect(stopResult.content[0].text).toContain('Success');

      // Step 7: Verify stopped
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.STOPPED,
      });

      const stoppedStatus = await handleGetStatus({});
      expect(stoppedStatus.isError).toBeFalsy();
      expect(stoppedStatus.content[0].text).toContain('stopped');
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle errors at any point in workflow', async () => {
      // Deploy succeeds
      vi.mocked(obiManager.deployLocal).mockResolvedValue({
        success: true,
        message: 'OBI deployed successfully',
        data: { pid: 12345 },
      });

      await handleDeployLocal({ config: { network: { enable: true } } });

      // Status check fails
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.ERROR,
        lastError: 'Process terminated unexpectedly',
      });

      const statusResult = await handleGetStatus({});
      expect(statusResult.content[0].text).toContain('error');
      expect(statusResult.content[0].text).toContain('Process terminated unexpectedly');

      // Stop should still work
      vi.mocked(obiManager.stop).mockResolvedValue({
        success: true,
        message: 'Cleanup completed',
      });

      const stopResult = await handleStop({});
      expect(stopResult.isError).toBeFalsy();
    });

    it('should handle concurrent operations gracefully', async () => {
      // Simulate attempting to deploy while already running
      vi.mocked(obiManager.deployLocal).mockResolvedValue({
        success: false,
        message: 'OBI is already running',
        error: 'Process already exists',
      });

      const deployResult = await handleDeployLocal({
        config: { network: { enable: true } },
      });

      expect(deployResult.isError).toBe(true);
      expect(deployResult.content[0].text).toContain('already running');
    });
  });
});
