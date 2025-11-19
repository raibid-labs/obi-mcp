/**
 * Docker Compose File Generator for OBI
 * Generates docker-compose.yml for OBI deployment
 */

import logger from '../../utils/logger.js';

export interface ComposeOptions {
  network?: string;
  targetPort?: number;
  includeCollector?: boolean;
  otlpEndpoint?: string;
  resources?: {
    cpus?: string;
    memory?: string;
  };
  volumes?: Record<string, string>;
}

export interface ComposeConfig {
  version: string;
  services: Record<string, unknown>;
  networks?: Record<string, unknown>;
  volumes?: Record<string, unknown>;
}

/**
 * Generator for Docker Compose configurations
 */
export class ComposeGenerator {
  /**
   * Generate a complete docker-compose.yml for OBI
   */
  generateCompose(options: ComposeOptions): string {
    logger.info('Generating docker-compose.yml', options);

    const config: ComposeConfig = {
      version: '3.8',
      services: {
        obi: this.generateOBIService(options),
      },
    };

    // Add collector service if requested
    if (options.includeCollector) {
      config.services['otel-collector'] = this.generateCollectorService(options);
    }

    // Add networks configuration
    if (options.network && options.network !== 'host') {
      config.networks = {
        'obi-network': {
          driver: 'bridge',
        },
      };
    }

    // Convert to YAML format
    return this.toYAML(config);
  }

  /**
   * Generate OBI service configuration
   */
  private generateOBIService(options: ComposeOptions): Record<string, unknown> {
    const service: Record<string, unknown> = {
      image: 'otel/ebpf-instrument:main',
      container_name: 'obi',
      pid: 'host',
      privileged: true,
      restart: 'unless-stopped',
    };

    // Network configuration
    if (options.network === 'host') {
      service.network_mode = 'host';
    } else if (options.network) {
      service.networks = [options.network];
    }

    // Environment variables
    const environment: string[] = [];
    if (options.otlpEndpoint) {
      environment.push(`OTEL_EXPORTER_OTLP_ENDPOINT=${options.otlpEndpoint}`);
    }
    if (options.targetPort) {
      environment.push(`OTEL_EBPF_OPEN_PORT=${options.targetPort}`);
    }
    if (environment.length > 0) {
      service.environment = environment;
    }

    // Resource limits
    if (options.resources) {
      service.deploy = {
        resources: {
          limits: {} as Record<string, string>,
        },
      };

      if (options.resources.cpus) {
        (service.deploy as any).resources.limits.cpus = options.resources.cpus;
      }
      if (options.resources.memory) {
        (service.deploy as any).resources.limits.memory = options.resources.memory;
      }
    }

    // Volume mounts
    if (options.volumes) {
      service.volumes = Object.entries(options.volumes).map(
        ([host, container]) => `${host}:${container}`
      );
    }

    return service;
  }

  /**
   * Generate OpenTelemetry Collector service configuration
   */
  private generateCollectorService(options: ComposeOptions): Record<string, unknown> {
    const service: Record<string, unknown> = {
      image: 'otel/opentelemetry-collector:latest',
      container_name: 'otel-collector',
      command: ['--config=/etc/otel-config.yaml'],
      restart: 'unless-stopped',
      ports: ['4317:4317', '4318:4318', '55679:55679'],
      volumes: ['./otel-config.yaml:/etc/otel-config.yaml:ro'],
    };

    // Network configuration
    if (options.network && options.network !== 'host') {
      service.networks = [options.network];
    }

    return service;
  }

  /**
   * Generate OpenTelemetry Collector configuration
   */
  generateCollectorConfig(options: { exportEndpoint?: string }): string {
    const config = {
      receivers: {
        otlp: {
          protocols: {
            grpc: {
              endpoint: '0.0.0.0:4317',
            },
            http: {
              endpoint: '0.0.0.0:4318',
            },
          },
        },
      },
      processors: {
        batch: {
          timeout: '10s',
          send_batch_size: 1024,
        },
        memory_limiter: {
          check_interval: '1s',
          limit_mib: 512,
        },
      },
      exporters: {
        logging: {
          loglevel: 'info',
        },
        ...(options.exportEndpoint && {
          otlp: {
            endpoint: options.exportEndpoint,
            tls: {
              insecure: true,
            },
          },
        }),
      },
      service: {
        pipelines: {
          traces: {
            receivers: ['otlp'],
            processors: ['memory_limiter', 'batch'],
            exporters: options.exportEndpoint ? ['logging', 'otlp'] : ['logging'],
          },
          metrics: {
            receivers: ['otlp'],
            processors: ['memory_limiter', 'batch'],
            exporters: options.exportEndpoint ? ['logging', 'otlp'] : ['logging'],
          },
        },
      },
    };

    return this.toYAML(config);
  }

  /**
   * Convert object to YAML format
   */
  private toYAML(obj: unknown, indent = 0): string {
    const spaces = ' '.repeat(indent);
    const lines: string[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${spaces}- ${this.toYAML(item, indent + 2).trim()}`);
        } else {
          lines.push(`${spaces}- ${item}`);
        }
      });
      return lines.join('\n');
    }

    Object.entries(obj).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            lines.push(`${spaces}${key}: []`);
          } else {
            lines.push(`${spaces}${key}:`);
            value.forEach((item) => {
              if (typeof item === 'object' && item !== null) {
                const itemYaml = this.toYAML(item, indent + 4);
                lines.push(`${spaces}  - `);
                itemYaml.split('\n').forEach((line, idx) => {
                  if (idx === 0) {
                    lines[lines.length - 1] += line.trim();
                  } else {
                    lines.push(`${spaces}    ${line.trim()}`);
                  }
                });
              } else {
                lines.push(`${spaces}  - ${item}`);
              }
            });
          }
        } else {
          lines.push(`${spaces}${key}:`);
          const nested = this.toYAML(value, indent + 2);
          lines.push(nested);
        }
      } else {
        const valueStr =
          typeof value === 'string' && (value.includes(':') || value.includes('#'))
            ? `"${value}"`
            : value;
        lines.push(`${spaces}${key}: ${valueStr}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Generate a complete deployment package
   */
  generateDeploymentPackage(options: ComposeOptions & { exportEndpoint?: string }): {
    composeFile: string;
    collectorConfig?: string;
    readme: string;
  } {
    const composeFile = this.generateCompose(options);
    const collectorConfig = options.includeCollector
      ? this.generateCollectorConfig({ exportEndpoint: options.exportEndpoint })
      : undefined;

    const readme = this.generateReadme(options);

    return {
      composeFile,
      collectorConfig,
      readme,
    };
  }

  /**
   * Generate README for deployment
   */
  private generateReadme(options: ComposeOptions): string {
    const sections: string[] = [];

    sections.push('# OBI Docker Deployment\n');
    sections.push('This package contains Docker Compose configuration for deploying OBI.\n');

    sections.push('## Quick Start\n');
    sections.push('```bash');
    sections.push('# Start OBI');
    sections.push('docker-compose up -d\n');
    sections.push('# Check status');
    sections.push('docker-compose ps\n');
    sections.push('# View logs');
    sections.push('docker-compose logs -f obi\n');
    sections.push('# Stop OBI');
    sections.push('docker-compose down');
    sections.push('```\n');

    if (options.includeCollector) {
      sections.push('## OpenTelemetry Collector\n');
      sections.push(
        'This deployment includes an OpenTelemetry Collector for processing telemetry data.\n'
      );
      sections.push('The collector is accessible on:');
      sections.push('- gRPC: `localhost:4317`');
      sections.push('- HTTP: `localhost:4318`\n');
    }

    sections.push('## Configuration\n');
    sections.push(`- Network Mode: ${options.network || 'host'}`);
    if (options.targetPort) {
      sections.push(`- Target Port: ${options.targetPort}`);
    }
    if (options.resources) {
      sections.push('\n### Resource Limits');
      if (options.resources.cpus) {
        sections.push(`- CPUs: ${options.resources.cpus}`);
      }
      if (options.resources.memory) {
        sections.push(`- Memory: ${options.resources.memory}`);
      }
    }

    sections.push('\n## Troubleshooting\n');
    sections.push('If OBI fails to start, check:');
    sections.push('1. Docker is running');
    sections.push('2. Privileged mode is enabled');
    sections.push('3. Host PID namespace access is available');
    sections.push('4. Network configuration is correct\n');

    sections.push('For more information, visit: https://github.com/open-telemetry/opentelemetry-ebpf');

    return sections.join('\n');
  }
}

/**
 * Singleton instance
 */
export const composeGenerator = new ComposeGenerator();
