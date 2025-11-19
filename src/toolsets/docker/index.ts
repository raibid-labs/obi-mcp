/**
 * Docker Toolset for OBI
 * Complete Docker integration for deploying and managing OBI containers
 */

import { Tool, Prompt, Resource } from '@modelcontextprotocol/sdk/types.js';
import type { Toolset } from '../base/index.js';
import {
  dockerDeployTool,
  handleDockerDeploy,
  dockerStatusTool,
  handleDockerStatus,
  dockerLogsTool,
  handleDockerLogs,
  dockerStopTool,
  handleDockerStop,
  dockerComposeTool,
  handleDockerCompose,
} from './tools/index.js';
import { listDockerResources, handleDockerResourceRead } from './resources/index.js';
import { setupDockerPrompt, getSetupDockerTemplate } from './prompts/setup-docker.js';
import logger from '../../utils/logger.js';

/**
 * Docker Toolset
 * Provides comprehensive Docker management capabilities for OBI
 */
export class DockerToolset implements Toolset {
  readonly name = 'docker';
  readonly description = 'Docker deployment and management for OBI';

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

    logger.info('Docker toolset initialized', {
      tools: this.tools.size,
      resources: this.resources.length,
      prompts: this.prompts.length,
    });
  }

  /**
   * Register all Docker tools
   */
  private registerTools(): void {
    // Deploy tool
    this.tools.set(dockerDeployTool.name, dockerDeployTool);
    this.toolHandlers.set(dockerDeployTool.name, handleDockerDeploy);

    // Status tool
    this.tools.set(dockerStatusTool.name, dockerStatusTool);
    this.toolHandlers.set(dockerStatusTool.name, handleDockerStatus);

    // Logs tool
    this.tools.set(dockerLogsTool.name, dockerLogsTool);
    this.toolHandlers.set(dockerLogsTool.name, handleDockerLogs);

    // Stop tool
    this.tools.set(dockerStopTool.name, dockerStopTool);
    this.toolHandlers.set(dockerStopTool.name, handleDockerStop);

    // Compose tool
    this.tools.set(dockerComposeTool.name, dockerComposeTool);
    this.toolHandlers.set(dockerComposeTool.name, handleDockerCompose);

    logger.debug(`Registered ${this.tools.size} Docker tools`);
  }

  /**
   * Register Docker resources
   */
  private registerResources(): void {
    this.resources = listDockerResources();
    logger.debug(`Registered ${this.resources.length} Docker resources`);
  }

  /**
   * Register Docker prompts
   */
  private registerPrompts(): void {
    this.prompts = [setupDockerPrompt];
    logger.debug(`Registered ${this.prompts.length} Docker prompts`);
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
   * Get resource read handler
   */
  getResourceReadHandler() {
    return handleDockerResourceRead;
  }

  /**
   * Get all prompts
   */
  getPrompts(): Prompt[] {
    return this.prompts;
  }

  /**
   * Get prompt template generator
   */
  getPromptTemplateGenerator(name: string) {
    if (name === setupDockerPrompt.name) {
      return (args?: unknown) => getSetupDockerTemplate(args as { environment?: string; includeCollector?: string });
    }
    return undefined;
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
export const dockerToolset = new DockerToolset();

/**
 * Export tools, resources, and prompts for direct access
 */
export * from './tools/index.js';
export * from './resources/index.js';
export * from './prompts/setup-docker.js';
export { dockerClient } from './docker-client.js';
export { composeGenerator } from './compose-generator.js';
