/**
 * Local Toolset Implementation
 * Provides tools, resources, and prompts for local OBI deployment
 */

import { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';
import type { Toolset, ToolHandler, ResourceReadHandler, PromptTemplateGenerator } from '../base/index.js';
import { logger } from '../../core/index.js';

// Import tools
import {
  getStatusTool,
  handleGetStatus,
  getConfigTool,
  handleGetConfig,
  getLogsTool,
  handleGetLogs,
  getDeployLocalTool,
  handleDeployLocal,
  updateConfigTool,
  handleUpdateConfig,
  stopTool,
  handleStop,
} from './tools/index.js';

// Import resources
import { resources, handleResourceRead } from './resources/index.js';

// Import prompts
import { prompts, getPromptTemplate } from './prompts/index.js';

/**
 * Local Toolset
 * Manages OBI deployment on local/standalone systems
 */
export class LocalToolset implements Toolset {
  readonly name = 'local';
  readonly description = 'Local/standalone OBI deployment toolset';

  private tools: Map<string, Tool>;
  private toolHandlers: Map<string, ToolHandler>;

  constructor() {
    this.tools = new Map();
    this.toolHandlers = new Map();
    this.registerTools();
  }

  /**
   * Register all tools for this toolset
   */
  private registerTools(): void {
    // Register status tool
    this.tools.set(getStatusTool.name, getStatusTool);
    this.toolHandlers.set(getStatusTool.name, handleGetStatus);

    // Register config tools
    this.tools.set(getConfigTool.name, getConfigTool);
    this.toolHandlers.set(getConfigTool.name, handleGetConfig);

    this.tools.set(updateConfigTool.name, updateConfigTool);
    this.toolHandlers.set(updateConfigTool.name, handleUpdateConfig);

    // Register logs tool
    this.tools.set(getLogsTool.name, getLogsTool);
    this.toolHandlers.set(getLogsTool.name, handleGetLogs);

    // Register deployment tools
    this.tools.set(getDeployLocalTool.name, getDeployLocalTool);
    this.toolHandlers.set(getDeployLocalTool.name, handleDeployLocal);

    this.tools.set(stopTool.name, stopTool);
    this.toolHandlers.set(stopTool.name, handleStop);

    logger.info(`[LocalToolset] Registered ${this.tools.size} tools`);
  }

  /**
   * Get all tools provided by this toolset
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get handler for a specific tool
   */
  getToolHandler(toolName: string): ToolHandler | undefined {
    return this.toolHandlers.get(toolName);
  }

  /**
   * Get all resources provided by this toolset
   */
  getResources(): Resource[] {
    return resources;
  }

  /**
   * Get handler for resource reads
   */
  getResourceReadHandler(): ResourceReadHandler {
    return handleResourceRead;
  }

  /**
   * Get all prompts provided by this toolset
   */
  getPrompts(): Prompt[] {
    return prompts;
  }

  /**
   * Get template generator for a specific prompt
   */
  getPromptTemplateGenerator(promptName: string): PromptTemplateGenerator | undefined {
    return (args?: unknown) => getPromptTemplate(promptName, args);
  }

  /**
   * Initialize the toolset
   */
  async initialize(): Promise<void> {
    logger.info('[LocalToolset] Initializing local toolset');
    // No special initialization needed for local toolset
  }

  /**
   * Cleanup the toolset
   */
  async cleanup(): Promise<void> {
    logger.info('[LocalToolset] Cleaning up local toolset');
    // No special cleanup needed for local toolset
  }
}

/**
 * Export a singleton instance
 */
export const localToolset = new LocalToolset();
