/**
 * Helm Client Wrapper
 * Provides Helm operations for OBI chart management
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

export interface HelmInstallOptions {
  chart: string;
  release: string;
  namespace: string;
  values?: Record<string, any>;
  version?: string;
  createNamespace?: boolean;
  wait?: boolean;
  timeout?: string;
}

export interface HelmUpgradeOptions {
  chart: string;
  release: string;
  namespace: string;
  values?: Record<string, any>;
  version?: string;
  install?: boolean;
  wait?: boolean;
  timeout?: string;
  reuseValues?: boolean;
}

export interface HelmRelease {
  name: string;
  namespace: string;
  revision: string;
  updated: string;
  status: string;
  chart: string;
  app_version: string;
}

export interface HelmStatusOutput {
  name: string;
  info: {
    first_deployed: string;
    last_deployed: string;
    deleted: string;
    description: string;
    status: string;
    notes: string;
  };
  config: Record<string, any>;
  manifest: string;
  version: number;
  namespace: string;
}

/**
 * Helm Client for managing OBI chart deployments
 */
export class HelmClient {
  /**
   * Install a Helm chart
   */
  async install(options: HelmInstallOptions): Promise<string> {
    const cmd = this.buildInstallCommand(options);
    logger.debug(`Executing Helm install: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stderr && !stderr.includes('STATUS:') && !stderr.includes('NOTES:')) {
        logger.warn(`Helm install warning: ${stderr}`);
      }
      logger.info(`Helm release ${options.release} installed successfully`);
      return stdout;
    } catch (error: any) {
      logger.error(`Helm install failed: ${error.message}`);
      throw new Error(`Helm install failed: ${error.message}\n${error.stderr || ''}`);
    }
  }

  /**
   * Upgrade a Helm release
   */
  async upgrade(options: HelmUpgradeOptions): Promise<string> {
    const cmd = this.buildUpgradeCommand(options);
    logger.debug(`Executing Helm upgrade: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stderr && !stderr.includes('STATUS:') && !stderr.includes('NOTES:')) {
        logger.warn(`Helm upgrade warning: ${stderr}`);
      }
      logger.info(`Helm release ${options.release} upgraded successfully`);
      return stdout;
    } catch (error: any) {
      logger.error(`Helm upgrade failed: ${error.message}`);
      throw new Error(`Helm upgrade failed: ${error.message}\n${error.stderr || ''}`);
    }
  }

  /**
   * List Helm releases
   */
  async list(namespace?: string, allNamespaces = false): Promise<HelmRelease[]> {
    const ns = allNamespaces ? '--all-namespaces' : namespace ? `-n ${namespace}` : '';
    const cmd = `helm list ${ns} -o json`;
    logger.debug(`Executing Helm list: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      const releases = JSON.parse(stdout || '[]');
      logger.debug(`Found ${releases.length} Helm releases`);
      return releases;
    } catch (error: any) {
      logger.error(`Helm list failed: ${error.message}`);
      throw new Error(`Helm list failed: ${error.message}`);
    }
  }

  /**
   * Get status of a Helm release
   */
  async status(release: string, namespace: string): Promise<HelmStatusOutput> {
    const cmd = `helm status ${release} -n ${namespace} -o json`;
    logger.debug(`Executing Helm status: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      const status = JSON.parse(stdout);
      logger.debug(`Helm release ${release} status: ${status.info.status}`);
      return status;
    } catch (error: any) {
      logger.error(`Helm status failed: ${error.message}`);
      throw new Error(`Helm status failed: ${error.message}`);
    }
  }

  /**
   * Uninstall a Helm release
   */
  async uninstall(release: string, namespace: string, keepHistory = false): Promise<string> {
    const cmd = `helm uninstall ${release} -n ${namespace}${keepHistory ? ' --keep-history' : ''}`;
    logger.debug(`Executing Helm uninstall: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      logger.info(`Helm release ${release} uninstalled successfully`);
      return stdout;
    } catch (error: any) {
      logger.error(`Helm uninstall failed: ${error.message}`);
      throw new Error(`Helm uninstall failed: ${error.message}`);
    }
  }

  /**
   * Get values for a release
   */
  async getValues(release: string, namespace: string, allValues = false): Promise<Record<string, any>> {
    const cmd = `helm get values ${release} -n ${namespace}${allValues ? ' --all' : ''} -o json`;
    logger.debug(`Executing Helm get values: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      return JSON.parse(stdout || '{}');
    } catch (error: any) {
      logger.error(`Helm get values failed: ${error.message}`);
      throw new Error(`Helm get values failed: ${error.message}`);
    }
  }

  /**
   * Test a Helm release
   */
  async test(release: string, namespace: string, timeout?: string): Promise<string> {
    const cmd = `helm test ${release} -n ${namespace}${timeout ? ` --timeout ${timeout}` : ''}`;
    logger.debug(`Executing Helm test: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      logger.info(`Helm test for ${release} completed successfully`);
      return stdout;
    } catch (error: any) {
      logger.error(`Helm test failed: ${error.message}`);
      throw new Error(`Helm test failed: ${error.message}`);
    }
  }

  /**
   * Build install command
   */
  buildInstallCommand(options: HelmInstallOptions): string {
    const parts = [
      'helm install',
      options.release,
      options.chart,
      `-n ${options.namespace}`,
    ];

    if (options.createNamespace) {
      parts.push('--create-namespace');
    }

    if (options.wait) {
      parts.push('--wait');
    }

    if (options.timeout) {
      parts.push(`--timeout ${options.timeout}`);
    }

    if (options.version) {
      parts.push(`--version ${options.version}`);
    }

    if (options.values) {
      parts.push(this.valuesToFlags(options.values));
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Build upgrade command
   */
  buildUpgradeCommand(options: HelmUpgradeOptions): string {
    const parts = [
      'helm upgrade',
      options.release,
      options.chart,
      `-n ${options.namespace}`,
    ];

    if (options.install) {
      parts.push('--install');
    }

    if (options.wait) {
      parts.push('--wait');
    }

    if (options.timeout) {
      parts.push(`--timeout ${options.timeout}`);
    }

    if (options.version) {
      parts.push(`--version ${options.version}`);
    }

    if (options.reuseValues) {
      parts.push('--reuse-values');
    }

    if (options.values) {
      parts.push(this.valuesToFlags(options.values));
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Convert values object to --set flags
   */
  private valuesToFlags(values: Record<string, any>, prefix = ''): string {
    const flags: string[] = [];

    for (const [key, value] of Object.entries(values)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Nested object - recurse
        flags.push(this.valuesToFlags(value, fullKey));
      } else if (Array.isArray(value)) {
        // Array - set with {item1,item2,item3}
        flags.push(`--set ${fullKey}="{${value.join(',')}}"`);
      } else {
        // Primitive value
        flags.push(`--set ${fullKey}=${value}`);
      }
    }

    return flags.filter(Boolean).join(' ');
  }

  /**
   * Check if Helm is installed
   */
  async checkHelm(): Promise<{ installed: boolean; version?: string }> {
    try {
      const { stdout } = await execAsync('helm version --short');
      const version = stdout.trim();
      logger.debug(`Helm version: ${version}`);
      return { installed: true, version };
    } catch {
      logger.warn('Helm is not installed or not in PATH');
      return { installed: false };
    }
  }

  /**
   * Add Helm repository
   */
  async addRepo(name: string, url: string, update = true): Promise<string> {
    const cmd = `helm repo add ${name} ${url}`;
    logger.debug(`Adding Helm repository: ${cmd}`);

    try {
      const { stdout } = await execAsync(cmd);
      if (update) {
        await this.updateRepos();
      }
      logger.info(`Helm repository ${name} added successfully`);
      return stdout;
    } catch (error: any) {
      logger.error(`Helm repo add failed: ${error.message}`);
      throw new Error(`Helm repo add failed: ${error.message}`);
    }
  }

  /**
   * Update Helm repositories
   */
  async updateRepos(): Promise<string> {
    const cmd = 'helm repo update';
    logger.debug('Updating Helm repositories');

    try {
      const { stdout } = await execAsync(cmd);
      logger.info('Helm repositories updated successfully');
      return stdout;
    } catch (error: any) {
      logger.error(`Helm repo update failed: ${error.message}`);
      throw new Error(`Helm repo update failed: ${error.message}`);
    }
  }
}

/**
 * Export singleton instance
 */
export const helmClient = new HelmClient();
