import { Tool, Prompt } from '@modelcontextprotocol/sdk/types.js';
import logger from '../../utils/logger.js';

import {
  k8sDeployTool,
  handleK8sDeploy,
  k8sStatusTool,
  handleK8sStatus,
  k8sConfigTool,
  handleK8sConfig,
  k8sLogsTool,
  handleK8sLogs,
  k8sUndeployTool,
  handleK8sUndeploy,
  k8sUpgradeTool,
  handleK8sUpgrade,
} from './tools/index.js';

import { listK8sResources, readK8sResource, K8S_RESOURCE_URIS } from './resources/index.js';

import {
  setupKubernetesPrompt,
  getSetupKubernetesTemplate,
} from './prompts/setup-kubernetes.js';

export class KubernetesToolset {
  private tools: Map<string, Tool>;
  private toolHandlers: Map<string, (args: unknown) => Promise<any>>;
  private prompts: Prompt[];

  constructor() {
    this.tools = new Map();
    this.toolHandlers = new Map();
    this.prompts = [];

    this.registerTools();
    this.registerPrompts();

    logger.info('Kubernetes toolset initialized');
  }

  private registerTools(): void {
    this.tools.set(k8sDeployTool.name, k8sDeployTool);
    this.toolHandlers.set(k8sDeployTool.name, handleK8sDeploy);

    this.tools.set(k8sStatusTool.name, k8sStatusTool);
    this.toolHandlers.set(k8sStatusTool.name, handleK8sStatus);

    this.tools.set(k8sConfigTool.name, k8sConfigTool);
    this.toolHandlers.set(k8sConfigTool.name, handleK8sConfig);

    this.tools.set(k8sLogsTool.name, k8sLogsTool);
    this.toolHandlers.set(k8sLogsTool.name, handleK8sLogs);

    this.tools.set(k8sUndeployTool.name, k8sUndeployTool);
    this.toolHandlers.set(k8sUndeployTool.name, handleK8sUndeploy);

    this.tools.set(k8sUpgradeTool.name, k8sUpgradeTool);
    this.toolHandlers.set(k8sUpgradeTool.name, handleK8sUpgrade);

    logger.info(`Registered ${this.tools.size} Kubernetes tools`);
  }

  private registerPrompts(): void {
    this.prompts.push(setupKubernetesPrompt);
    logger.info(`Registered ${this.prompts.length} Kubernetes prompts`);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolHandler(name: string): ((args: unknown) => Promise<any>) | undefined {
    return this.toolHandlers.get(name);
  }

  getPrompts(): Prompt[] {
    return this.prompts;
  }

  getPromptTemplate(name: string, args?: unknown): string {
    if (name === setupKubernetesPrompt.name) {
      return getSetupKubernetesTemplate(args as Record<string, unknown>);
    }

    throw new Error(`Unknown prompt: ${name}`);
  }

  listResources() {
    return listK8sResources();
  }

  async readResource(uri: string, namespace?: string) {
    return await readK8sResource(uri, namespace);
  }
}

export function createKubernetesToolset(): KubernetesToolset {
  return new KubernetesToolset();
}

export { K8S_RESOURCE_URIS };
