/**
 * Kubernetes Toolset for OBI
 * Helm-based deployment and management for Kubernetes clusters
 */

import { Tool, Prompt, Resource } from '@modelcontextprotocol/sdk/types.js';
import {
  helmInstallTool,
  handleHelmInstall,
  helmUpgradeTool,
  handleHelmUpgrade,
} from './tools/index.js';
import logger from '../../utils/logger.js';

/**
 * Kubernetes Toolset
 * Provides Helm-based Kubernetes management capabilities for OBI
 */
export class KubernetesToolset {
  private tools: Map<string, Tool>;
  private toolHandlers: Map<string, (args: unknown) => Promise<any>>;
  private resources: Resource[];
  private prompts: Prompt[];

  constructor() {
    this.tools = new Map();
    this.toolHandlers = new Map();
    this.resources = [];
    this.prompts = [];

    this.registerTools();
    this.registerResources();
    this.registerPrompts();

    logger.info('Kubernetes toolset initialized', {
      tools: this.tools.size,
      resources: this.resources.length,
      prompts: this.prompts.length,
    });
  }

  /**
   * Register all Kubernetes tools
   */
  private registerTools(): void {
    // Helm install tool
    this.tools.set(helmInstallTool.name, helmInstallTool);
    this.toolHandlers.set(helmInstallTool.name, handleHelmInstall);

    // Helm upgrade tool
    this.tools.set(helmUpgradeTool.name, helmUpgradeTool);
    this.toolHandlers.set(helmUpgradeTool.name, handleHelmUpgrade);

    logger.debug(`Registered ${this.tools.size} Kubernetes tools`);
  }

  /**
   * Register Kubernetes resources
   */
  private registerResources(): void {
    // Resources can be added here for Helm-specific data
    // e.g., obi-k8s://helm/releases, obi-k8s://helm/values
    this.resources = [];
    logger.debug(`Registered ${this.resources.length} Kubernetes resources`);
  }

  /**
   * Register Kubernetes prompts
   */
  private registerPrompts(): void {
    // Prompts can be added here for guided Helm setup
    this.prompts = [];
    logger.debug(`Registered ${this.prompts.length} Kubernetes prompts`);
  }

  /**
   * Get all tools
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool handler
   */
  getToolHandler(name: string): ((args: unknown) => Promise<any>) | undefined {
    return this.toolHandlers.get(name);
  }

  /**
   * Get all resources
   */
  getResources(): Resource[] {
    return this.resources;
  }

  /**
   * Handle resource read
   */
  async handleResourceRead(uri: string): Promise<any> {
    throw new Error(`Resource not found: ${uri}`);
  }

  /**
   * Get all prompts
   */
  getPrompts(): Prompt[] {
    return this.prompts;
  }

  /**
   * Get prompt template
   */
  getPromptTemplate(name: string, _args?: unknown): string {
    throw new Error(`Unknown Kubernetes prompt: ${name}`);
  }

  /**
   * Check if a tool belongs to this toolset
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a resource belongs to this toolset
   */
  hasResource(uri: string): boolean {
    return this.resources.some((r) => r.uri === uri);
  }

  /**
   * Check if a prompt belongs to this toolset
   */
  hasPrompt(name: string): boolean {
    return this.prompts.some((p) => p.name === name);
  }
}

/**
 * Export singleton instance
 */
export const kubernetesToolset = new KubernetesToolset();

/**
 * Export tools for direct access
 */
export * from './tools/index.js';
export { helmClient } from './helm-client.js';
