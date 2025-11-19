import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execAsync = promisify(exec);

export interface KubectlExecOptions {
  namespace?: string;
  context?: string;
  kubeconfig?: string;
}

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  node?: string;
}

export interface LogOptions {
  since?: string;
  tail?: number;
  timestamps?: boolean;
  previous?: boolean;
}

export class KubectlClient {
  private defaultNamespace?: string;
  private defaultContext?: string;
  private kubeconfigPath?: string;

  constructor(options?: KubectlExecOptions) {
    this.defaultNamespace = options?.namespace;
    this.defaultContext = options?.context;
    this.kubeconfigPath = options?.kubeconfig;
  }

  private buildBaseCommand(options?: KubectlExecOptions): string {
    const parts = ['kubectl'];
    const kubeconfig = options?.kubeconfig || this.kubeconfigPath;
    if (kubeconfig) parts.push(`--kubeconfig="${kubeconfig}"`);
    const context = options?.context || this.defaultContext;
    if (context) parts.push(`--context="${context}"`);
    return parts.join(' ');
  }

  private async exec(_command: string, options?: KubectlExecOptions): Promise<string> {
    const _baseCmd = this.buildBaseCommand(options);
    const namespace = options?.namespace || this.defaultNamespace;
    const _nsFlag = namespace ? `-n "${namespace}"` : '';
    const fullCommand = `${_baseCmd} ${_command} ${_nsFlag}`;

    logger.debug(`Executing: ${fullCommand}`);

    try {
      const { stdout, stderr } = await execAsync(fullCommand, { maxBuffer: 10 * 1024 * 1024 });
      if (stderr && !stderr.includes('Warning')) {
        logger.warn(`kubectl stderr: ${stderr}`);
      }
      return stdout;
    } catch (error) {
      const _errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`kubectl command failed: ${_errMsg}`);
      throw new Error(`kubectl failed: ${_errMsg}`);
    }
  }

  async apply(_manifest: string, options?: KubectlExecOptions): Promise<void> {
    const _baseCmd = this.buildBaseCommand(options);
    const namespace = options?.namespace || this.defaultNamespace;
    const _nsFlag = namespace ? `-n "${namespace}"` : '';
    const command = `echo '${_manifest.replace(/'/g, "'\\''")}' | ${_baseCmd} apply ${_nsFlag} -f -`;

    logger.debug('Applying manifest...');

    try {
      const { stdout: _stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      if (stderr && !stderr.includes('Warning')) {
        logger.warn(`kubectl apply stderr: ${stderr}`);
      }
      logger.info(`kubectl apply result: ${_stdout.trim()}`);
    } catch (error) {
      const _errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`kubectl apply failed: ${_errMsg}`);
      throw new Error(`Failed to apply manifest: ${_errMsg}`);
    }
  }

  async delete(_resourceType: string, _name: string, options?: KubectlExecOptions): Promise<void> {
    await this.exec(`delete ${_resourceType} "${_name}" --ignore-not-found=true`, options);
    logger.info(`Deleted ${_resourceType}/${_name}`);
  }

  async get<T = any>(_resource: string, options?: KubectlExecOptions): Promise<T> {
    const output = await this.exec(`get ${_resource} -o json`, options);
    return JSON.parse(output) as T;
  }

  async getPods(labelSelector?: string, options?: KubectlExecOptions): Promise<PodInfo[]> {
    const _selector = labelSelector ? `-l "${labelSelector}"` : '';
    const output = await this.exec(`get pods ${_selector} -o json`, options);
    const result = JSON.parse(output);
    if (!result.items) return [];

    return result.items.map((pod: any) => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      ready: this.getPodReadyStatus(pod),
      restarts: this.getPodRestartCount(pod),
      age: this.calculateAge(pod.metadata.creationTimestamp),
      node: pod.spec.nodeName,
    }));
  }

  async logs(_podName: string, options?: KubectlExecOptions & LogOptions): Promise<string> {
    const logOpts: string[] = [];
    if (options?.since) logOpts.push(`--since="${options.since}"`);
    if (options?.tail) logOpts.push(`--tail=${options.tail}`);
    if (options?.timestamps) logOpts.push('--timestamps=true');
    if (options?.previous) logOpts.push('--previous=true');

    const command = `logs "${_podName}" ${logOpts.join(' ')}`;
    return await this.exec(command, options);
  }

  async namespaceExists(_namespace: string): Promise<boolean> {
    try {
      await this.exec(`get namespace "${_namespace}"`, {});
      return true;
    } catch {
      return false;
    }
  }

  async createNamespace(_namespace: string): Promise<void> {
    await this.exec(`create namespace "${_namespace}"`, {});
    logger.info(`Created namespace: ${_namespace}`);
  }

  async getRolloutStatus(_resourceType: string, _name: string, options?: KubectlExecOptions): Promise<string> {
    try {
      return await this.exec(`rollout status ${_resourceType}/"${_name}"`, options);
    } catch (error) {
      return `Rollout status unavailable: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async checkConnectivity(): Promise<{ connected: boolean; version?: string; error?: string }> {
    try {
      const output = await this.exec('version --short', {});
      return { connected: true, version: output.trim() };
    } catch (error) {
      return { connected: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getNodes(): Promise<Array<{ name: string; status: string; roles: string; age: string }>> {
    try {
      const output = await this.exec('get nodes -o json', {});
      const result = JSON.parse(output);
      if (!result.items) return [];

      return result.items.map((node: any) => ({
        name: node.metadata.name,
        status: this.getNodeStatus(node),
        roles: this.getNodeRoles(node),
        age: this.calculateAge(node.metadata.creationTimestamp),
      }));
    } catch (error) {
      logger.error(`Failed to get nodes: ${error}`);
      return [];
    }
  }

  async getConfigMap(_name: string, options?: KubectlExecOptions): Promise<any> {
    return await this.get(`configmap "${_name}"`, options);
  }

  async createConfigMap(_name: string, data: Record<string, string>, options?: KubectlExecOptions): Promise<void> {
    const _dataArgs = Object.entries(data)
      .map(([_key, _value]) => `--from-literal="${_key}=${_value}"`)
      .join(' ');

    try {
      await this.exec(`create configmap "${_name}" ${_dataArgs}`, options);
      logger.info(`Created ConfigMap: ${_name}`);
    } catch {
      await this.exec(`create configmap "${_name}" ${_dataArgs} --dry-run=client -o yaml`, options)
        .then((manifest) => this.apply(manifest, options));
      logger.info(`Updated ConfigMap: ${_name}`);
    }
  }

  private getPodReadyStatus(pod: any): string {
    const _totalContainers = pod.spec.containers?.length || 0;
    const _readyContainers = pod.status.containerStatuses?.filter((c: any) => c.ready).length || 0;
    return `${_readyContainers}/${_totalContainers}`;
  }

  private getPodRestartCount(pod: any): number {
    const containerStatuses = pod.status.containerStatuses || [];
    return containerStatuses.reduce((sum: number, c: any) => sum + (c.restartCount || 0), 0);
  }

  private calculateAge(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const _diffDays = Math.floor(diffHours / 24);
    return `${_diffDays}d`;
  }

  private getNodeStatus(node: any): string {
    const conditions = node.status.conditions || [];
    const readyCondition = conditions.find((c: any) => c.type === 'Ready');
    return readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
  }

  private getNodeRoles(node: any): string {
    const labels = node.metadata.labels || {};
    const roles: string[] = [];
    if (labels['node-role.kubernetes.io/control-plane'] || labels['node-role.kubernetes.io/master']) {
      roles.push('control-plane');
    }
    if (labels['node-role.kubernetes.io/worker']) {
      roles.push('worker');
    }
    return roles.length > 0 ? roles.join(',') : '<none>';
  }
}

export function createKubectlClient(options?: KubectlExecOptions): KubectlClient {
  return new KubectlClient(options);
}
