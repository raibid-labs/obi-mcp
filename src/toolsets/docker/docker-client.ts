/**
 * Docker Client for OBI Container Management
 * Wraps dockerode for OBI-specific Docker operations
 */

import Docker from 'dockerode';
import logger from '../../utils/logger.js';

export interface DockerDeployConfig {
  config?: Record<string, unknown>;
  configPath?: string;
  targetPort?: number;
  network?: string;
  mode?: 'standalone' | 'compose';
  resources?: {
    cpus?: string;
    memory?: string;
  };
  otlpEndpoint?: string;
}

export interface DockerStatus {
  id: string;
  name: string;
  status: string;
  running: boolean;
  startedAt?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networks: string[];
  ports?: Record<string, string>;
}

export interface LogOptions {
  lines?: number;
  follow?: boolean;
  since?: string;
  level?: 'info' | 'warn' | 'error';
}

export interface StopOptions {
  force?: boolean;
  removeVolumes?: boolean;
}

const OBI_CONTAINER_NAME = 'obi';
const OBI_IMAGE = 'otel/ebpf-instrument:main';

/**
 * Docker client for OBI operations
 */
export class DockerClient {
  private docker: Docker;

  constructor() {
    // Initialize Docker client with default socket
    this.docker = new Docker();
  }

  /**
   * Check if Docker is available and running
   */
  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      logger.error('Docker is not available:', error);
      return false;
    }
  }

  /**
   * Get version information
   */
  async getVersion(): Promise<any> {
    try {
      const version = await this.docker.version();
      return version as any;
    } catch (error) {
      logger.error('Failed to get Docker version:', error);
      throw new Error('Failed to get Docker version');
    }
  }

  /**
   * Deploy OBI container
   */
  async deployOBI(config: DockerDeployConfig): Promise<string> {
    try {
      logger.info('Deploying OBI container...', config);

      // Check if container already exists
      const existingContainer = await this.findOBIContainer();
      if (existingContainer) {
        logger.warn('OBI container already exists, removing old container');
        await this.stop({ force: true });
      }

      // Pull latest image if needed
      await this.pullImage(OBI_IMAGE);

      // Create container configuration
      const containerConfig: Docker.ContainerCreateOptions = {
        Image: OBI_IMAGE,
        name: OBI_CONTAINER_NAME,
        Hostname: 'obi',
        HostConfig: {
          PidMode: 'host',
          Privileged: true,
          NetworkMode: config.network || 'host',
          RestartPolicy: {
            Name: 'unless-stopped',
          },
          ...(config.resources && {
            Memory: this.parseMemory(config.resources.memory),
            NanoCpus: this.parseCPUs(config.resources.cpus),
          }),
        },
        Env: this.buildEnvironmentVariables(config),
      };

      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      const containerInfo = await container.inspect();
      logger.info('OBI container deployed successfully', { id: containerInfo.Id });

      return containerInfo.Id;
    } catch (error) {
      logger.error('Failed to deploy OBI container:', error);
      throw new Error(
        `Failed to deploy OBI container: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get OBI container status
   */
  async getStatus(): Promise<DockerStatus> {
    try {
      const container = await this.findOBIContainer();
      if (!container) {
        return {
          id: '',
          name: OBI_CONTAINER_NAME,
          status: 'not found',
          running: false,
          networks: [],
        };
      }

      const info = await container.inspect();
      const stats = info.State.Running
        ? await container.stats({ stream: false })
        : undefined;

      return {
        id: info.Id.substring(0, 12),
        name: info.Name.replace(/^\//, ''),
        status: info.State.Status,
        running: info.State.Running,
        startedAt: info.State.StartedAt,
        cpuUsage: stats ? this.calculateCPUUsage(stats as Docker.ContainerStats) : undefined,
        memoryUsage: stats
          ? (stats as Docker.ContainerStats).memory_stats.usage / 1024 / 1024
          : undefined,
        memoryLimit: stats
          ? (stats as Docker.ContainerStats).memory_stats.limit / 1024 / 1024
          : undefined,
        networks: Object.keys(info.NetworkSettings.Networks),
        ports: this.formatPorts(info.NetworkSettings.Ports),
      };
    } catch (error) {
      logger.error('Failed to get container status:', error);
      throw new Error(
        `Failed to get container status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get container logs
   */
  async getLogs(options: LogOptions): Promise<string> {
    try {
      const container = await this.findOBIContainer();
      if (!container) {
        throw new Error('OBI container not found');
      }

      // Get logs - use false for non-follow mode
      const logStream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.lines || 100,
        timestamps: true,
        ...(options.since && { since: this.parseTimestamp(options.since) }),
        follow: false,
      });

      // Convert stream/buffer to string
      let logs: string;
      if (Buffer.isBuffer(logStream)) {
        logs = logStream.toString('utf8');
      } else {
        logs = String(logStream);
      }

      // Filter by level if specified
      if (options.level && options.level !== 'info') {
        return this.filterLogsByLevel(logs, options.level);
      }

      return logs;
    } catch (error) {
      logger.error('Failed to get container logs:', error);
      throw new Error(
        `Failed to get container logs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop OBI container
   */
  async stop(options: StopOptions = {}): Promise<void> {
    try {
      const container = await this.findOBIContainer();
      if (!container) {
        logger.warn('OBI container not found, nothing to stop');
        return;
      }

      logger.info('Stopping OBI container...', options);

      if (options.force) {
        await container.kill();
      } else {
        await container.stop({ t: 10 }); // 10 second grace period
      }

      // Remove container
      await container.remove({ v: options.removeVolumes || false });

      logger.info('OBI container stopped and removed');
    } catch (error) {
      logger.error('Failed to stop container:', error);
      throw new Error(
        `Failed to stop container: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find OBI container
   */
  private async findOBIContainer(): Promise<Docker.Container | null> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      const obiContainer = containers.find(
        (c) =>
          c.Names.some((name) => name === `/${OBI_CONTAINER_NAME}`) || c.Image === OBI_IMAGE
      );

      if (obiContainer) {
        return this.docker.getContainer(obiContainer.Id);
      }

      return null;
    } catch (error) {
      logger.error('Failed to find OBI container:', error);
      return null;
    }
  }

  /**
   * Pull Docker image
   */
  private async pullImage(image: string): Promise<void> {
    try {
      logger.info(`Pulling Docker image: ${image}`);

      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(
            stream,
            (err: Error | null) => {
              if (err) reject(err);
              else resolve();
            },
            (event: { status?: string; progress?: string }) => {
              logger.debug('Pull progress:', event);
            }
          );
        });
      });

      logger.info(`Successfully pulled image: ${image}`);
    } catch (error) {
      logger.warn('Failed to pull image, will use cached version:', error);
      // Don't throw error, allow using cached image
    }
  }

  /**
   * Build environment variables for container
   */
  private buildEnvironmentVariables(config: DockerDeployConfig): string[] {
    const env: string[] = [];

    if (config.otlpEndpoint) {
      env.push(`OTEL_EXPORTER_OTLP_ENDPOINT=${config.otlpEndpoint}`);
    }

    if (config.targetPort) {
      env.push(`OTEL_EBPF_OPEN_PORT=${config.targetPort}`);
    }

    // Add any custom environment variables from config
    if (config.config) {
      Object.entries(config.config).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          env.push(`${key}=${value}`);
        }
      });
    }

    return env;
  }

  /**
   * Parse memory string to bytes
   */
  private parseMemory(memory?: string): number | undefined {
    if (!memory) return undefined;

    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = memory.toLowerCase().match(/^(\d+)([bkmg])?$/);
    if (!match) return undefined;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'b';

    return value * units[unit];
  }

  /**
   * Parse CPU string to NanoCPUs
   */
  private parseCPUs(cpus?: string): number | undefined {
    if (!cpus) return undefined;

    const value = parseFloat(cpus);
    if (isNaN(value)) return undefined;

    // Convert to NanoCPUs (1 CPU = 1e9 NanoCPUs)
    return Math.floor(value * 1e9);
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCPUUsage(stats: Docker.ContainerStats): number {
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }

    return 0;
  }

  /**
   * Format port mappings
   */
  private formatPorts(ports: Docker.PortMap): Record<string, string> {
    const formatted: Record<string, string> = {};

    Object.entries(ports || {}).forEach(([container, hosts]) => {
      if (hosts && hosts.length > 0) {
        const host = hosts[0];
        formatted[container] = `${host.HostIp}:${host.HostPort}`;
      }
    });

    return formatted;
  }

  /**
   * Parse timestamp string to seconds since epoch
   */
  private parseTimestamp(since: string): number {
    const now = Date.now();
    const match = since.match(/^(\d+)([smhd])$/);

    if (!match) {
      return Math.floor(now / 1000) - 3600; // Default to 1 hour ago
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return Math.floor(now / 1000) - value * multipliers[unit];
  }

  /**
   * Filter logs by level
   */
  private filterLogsByLevel(logs: string, level: string): string {
    const lines = logs.split('\n');
    const pattern = new RegExp(`\\b${level}\\b`, 'i');

    return lines.filter((line) => pattern.test(line)).join('\n');
  }
}

/**
 * Singleton instance
 */
export const dockerClient = new DockerClient();
