/**
 * Helm Client Tests
 */

import { describe, it, expect } from 'vitest';
import { HelmClient } from '../../../../src/toolsets/kubernetes/helm-client.js';

describe('HelmClient', () => {
  const client = new HelmClient();

  describe('buildInstallCommand', () => {
    it('should generate basic install command', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
      });

      expect(cmd).toContain('helm install');
      expect(cmd).toContain('test-obi');
      expect(cmd).toContain('oci://ghcr.io/raibid-labs/charts/obi');
      expect(cmd).toContain('-n observability');
    });

    it('should include createNamespace flag', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        createNamespace: true,
      });

      expect(cmd).toContain('--create-namespace');
    });

    it('should include wait flag', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        wait: true,
      });

      expect(cmd).toContain('--wait');
    });

    it('should include timeout', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        timeout: '10m',
      });

      expect(cmd).toContain('--timeout 10m');
    });

    it('should include version', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        version: '0.2.0',
      });

      expect(cmd).toContain('--version 0.2.0');
    });

    it('should convert simple values to --set flags', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        values: {
          'image.tag': 'v0.2.0',
          'obi.openPort': 8080,
        },
      });

      expect(cmd).toContain('--set image.tag=v0.2.0');
      expect(cmd).toContain('--set obi.openPort=8080');
    });

    it('should convert nested values to --set flags', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        values: {
          image: {
            tag: 'v0.2.0',
            pullPolicy: 'Always',
          },
        },
      });

      expect(cmd).toContain('--set image.tag=v0.2.0');
      expect(cmd).toContain('--set image.pullPolicy=Always');
    });

    it('should convert array values to --set flags', () => {
      const cmd = client.buildInstallCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        values: {
          'obi.allowedAttributes': ['http.method', 'http.status_code'],
        },
      });

      expect(cmd).toContain('--set obi.allowedAttributes="{http.method,http.status_code}"');
    });
  });

  describe('buildUpgradeCommand', () => {
    it('should generate basic upgrade command', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
      });

      expect(cmd).toContain('helm upgrade');
      expect(cmd).toContain('test-obi');
      expect(cmd).toContain('oci://ghcr.io/raibid-labs/charts/obi');
      expect(cmd).toContain('-n observability');
    });

    it('should include install flag', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        install: true,
      });

      expect(cmd).toContain('--install');
    });

    it('should include reuse-values flag', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        reuseValues: true,
      });

      expect(cmd).toContain('--reuse-values');
    });

    it('should include wait and timeout', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        wait: true,
        timeout: '5m',
      });

      expect(cmd).toContain('--wait');
      expect(cmd).toContain('--timeout 5m');
    });

    it('should include version', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        version: '0.2.0',
      });

      expect(cmd).toContain('--version 0.2.0');
    });

    it('should convert values to --set flags', () => {
      const cmd = client.buildUpgradeCommand({
        chart: 'oci://ghcr.io/raibid-labs/charts/obi',
        release: 'test-obi',
        namespace: 'observability',
        values: {
          'image.tag': 'v0.3.0',
        },
      });

      expect(cmd).toContain('--set image.tag=v0.3.0');
    });
  });

  describe('checkHelm', () => {
    it('should check if Helm is installed', async () => {
      const result = await client.checkHelm();

      // This will pass or fail based on whether Helm is installed
      expect(result).toHaveProperty('installed');
      if (result.installed) {
        expect(result).toHaveProperty('version');
      }
    });
  });
});
