/**
 * Docker Compose Generator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComposeGenerator } from '../../../../src/toolsets/docker/compose-generator.js';

describe('ComposeGenerator', () => {
  let generator: ComposeGenerator;

  beforeEach(() => {
    generator = new ComposeGenerator();
  });

  describe('generateCompose', () => {
    it('should generate basic compose file', () => {
      const compose = generator.generateCompose({
        network: 'host',
        targetPort: 8080,
        otlpEndpoint: 'http://localhost:4317',
      });

      expect(compose).toContain('version: 3.8');
      expect(compose).toContain('services:');
      expect(compose).toContain('obi:');
      expect(compose).toMatch(/image:.*otel\/ebpf-instrument:main/);
      expect(compose).toContain('privileged: true');
    });

    it('should include collector when requested', () => {
      const compose = generator.generateCompose({
        network: 'host',
        targetPort: 8080,
        includeCollector: true,
        otlpEndpoint: 'http://otel-collector:4317',
      });

      expect(compose).toContain('otel-collector:');
      expect(compose).toMatch(/image:.*otel\/opentelemetry-collector:latest/);
    });

    it('should include resource limits', () => {
      const compose = generator.generateCompose({
        network: 'host',
        targetPort: 8080,
        resources: {
          cpus: '2.0',
          memory: '2g',
        },
      });

      expect(compose).toContain('cpus: 2.0');
      expect(compose).toContain('memory: 2g');
    });

    it('should include environment variables', () => {
      const compose = generator.generateCompose({
        network: 'host',
        targetPort: 9090,
        otlpEndpoint: 'http://custom:4317',
      });

      expect(compose).toMatch(/OTEL_EXPORTER_OTLP_ENDPOINT.*http:\/\/custom:4317/);
      expect(compose).toMatch(/OTEL_EBPF_OPEN_PORT.*9090/);
    });
  });

  describe('generateCollectorConfig', () => {
    it('should generate collector configuration', () => {
      const config = generator.generateCollectorConfig({});

      expect(config).toContain('receivers:');
      expect(config).toContain('otlp:');
      expect(config).toContain('processors:');
      expect(config).toContain('exporters:');
      expect(config).toContain('service:');
      expect(config).toContain('pipelines:');
    });

    it('should include export endpoint when provided', () => {
      const config = generator.generateCollectorConfig({
        exportEndpoint: 'http://backend:4317',
      });

      expect(config).toContain('http://backend:4317');
    });
  });

  describe('generateDeploymentPackage', () => {
    it('should generate complete deployment package', () => {
      const pkg = generator.generateDeploymentPackage({
        network: 'host',
        targetPort: 8080,
        includeCollector: true,
      });

      expect(pkg).toHaveProperty('composeFile');
      expect(pkg).toHaveProperty('collectorConfig');
      expect(pkg).toHaveProperty('readme');

      expect(pkg.composeFile).toContain('version: 3.8');
      expect(pkg.collectorConfig).toContain('receivers:');
      expect(pkg.readme).toContain('# OBI Docker Deployment');
    });

    it('should not include collector config when not requested', () => {
      const pkg = generator.generateDeploymentPackage({
        network: 'host',
        targetPort: 8080,
        includeCollector: false,
      });

      expect(pkg.collectorConfig).toBeUndefined();
    });
  });
});
