/**
 * Toolset Base Types
 * Defines the interface for all OBI MCP toolsets
 */

import { Tool, Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool handler function type
 */
export type ToolHandler = (args: unknown) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

/**
 * Resource read handler function type
 */
export type ResourceReadHandler = (uri: string) => Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
  }>;
}>;

/**
 * Prompt template generator function type
 */
export type PromptTemplateGenerator = (args?: unknown) => string;

/**
 * Toolset interface
 * All toolsets must implement this interface
 */
export interface Toolset {
  /**
   * Toolset identifier (e.g., 'local', 'kubernetes', 'docker')
   */
  readonly name: string;

  /**
   * Human-readable description
   */
  readonly description: string;

  /**
   * Get all tools provided by this toolset
   */
  getTools(): Tool[];

  /**
   * Get handler for a specific tool
   */
  getToolHandler(toolName: string): ToolHandler | undefined;

  /**
   * Get all resources provided by this toolset
   */
  getResources(): Resource[];

  /**
   * Get handler for resource reads
   */
  getResourceReadHandler(): ResourceReadHandler | undefined;

  /**
   * Get all prompts provided by this toolset
   */
  getPrompts(): Prompt[];

  /**
   * Get template generator for a specific prompt
   */
  getPromptTemplateGenerator(promptName: string): PromptTemplateGenerator | undefined;

  /**
   * Initialize the toolset (called on server startup)
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup the toolset (called on server shutdown)
   */
  cleanup?(): Promise<void>;
}
