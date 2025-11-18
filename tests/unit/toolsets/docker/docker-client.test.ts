/**
 * Docker Client Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DockerClient } from '../../../../src/toolsets/docker/docker-client.js';

// Mock dockerode
vi.mock('dockerode', () => {
  const mockContainer = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    inspect: vi.fn().mockResolvedValue({
      Id: 'mock-container-id-12345',
      Name: '/obi',
      State: {
        Status: 'running',
        Running: true,
        StartedAt: '2024-01-01T00:00:00.000Z',
      },
      NetworkSettings: {
        Networks: {
          host: {},
        },
        Ports: {},
      },
    }),
    stats: vi.fn().mockResolvedValue({
      cpu_stats: {
        cpu_usage: { total_usage: 1000000 },
        system_cpu_usage: 5000000,
        online_cpus: 4,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 900000 },
        system_cpu_usage: 4900000,
      },
      memory_stats: {
        usage: 100 * 1024 * 1024, // 100MB
        limit: 500 * 1024 * 1024, // 500MB
      },
    }),
    logs: vi.fn().mockResolvedValue(Buffer.from('Mock log output\nAnother log line\n')),
  };

  const MockDocker = vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue(true),
    version: vi.fn().mockResolvedValue({ Version: '24.0.0', ApiVersion: '1.43' }),
    listContainers: vi.fn().mockResolvedValue([
      {
        Id: 'mock-container-id',
        Names: ['/obi'],
        Image: 'otel/ebpf-instrument:main',
        State: 'running',
      },
    ]),
    getContainer: vi.fn().mockReturnValue(mockContainer),
    createContainer: vi.fn().mockResolvedValue(mockContainer),
    pull: vi.fn().mockImplementation((image, callback) => {
      const mockStream = {
        on: vi.fn(),
      };
      callback(null, mockStream);
    }),
    modem: {
      followProgress: vi.fn((stream, onFinished, onProgress) => {
        onFinished(null);
      }),
    },
  }));

  return { default: MockDocker };
});

describe('DockerClient', () => {
  let client: DockerClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new DockerClient();
  });

  describe('ping', () => {
    it('should return true when Docker is available', async () => {
      const result = await client.ping();
      expect(result).toBe(true);
    });
  });

  describe('getVersion', () => {
    it('should return Docker version information', async () => {
      const version = await client.getVersion();
      expect(version).toHaveProperty('Version');
      expect(version).toHaveProperty('ApiVersion');
    });
  });

  describe('deployOBI', () => {
    it('should deploy OBI container successfully', async () => {
      const config = {
        targetPort: 8080,
        network: 'host',
        otlpEndpoint: 'http://localhost:4317',
      };

      const containerId = await client.deployOBI(config);
      expect(containerId).toBe('mock-container-id-12345');
    });

    it('should deploy with resource limits', async () => {
      const config = {
        targetPort: 8080,
        network: 'host',
        otlpEndpoint: 'http://localhost:4317',
        resources: {
          cpus: '2.0',
          memory: '1g',
        },
      };

      const containerId = await client.deployOBI(config);
      expect(containerId).toBeTruthy();
    });
  });

  describe('getStatus', () => {
    it('should return container status when running', async () => {
      const status = await client.getStatus();

      expect(status).toMatchObject({
        id: 'mock-contain',
        name: 'obi',
        status: 'running',
        running: true,
      });
      expect(status.networks).toContain('host');
    });
  });

  describe('getLogs', () => {
    it('should retrieve container logs', async () => {
      const logs = await client.getLogs({ lines: 100 });
      expect(logs).toContain('Mock log output');
    });

    it('should retrieve logs with since parameter', async () => {
      const logs = await client.getLogs({ lines: 50, since: '10m' });
      expect(logs).toBeTruthy();
    });
  });

  describe('stop', () => {
    it('should stop container gracefully', async () => {
      await expect(client.stop({ force: false })).resolves.not.toThrow();
    });

    it('should force stop container', async () => {
      await expect(client.stop({ force: true })).resolves.not.toThrow();
    });

    it('should remove volumes when requested', async () => {
      await expect(client.stop({ removeVolumes: true })).resolves.not.toThrow();
    });
  });
});
