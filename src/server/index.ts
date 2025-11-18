/**
 * OBI MCP Server
 * Main server implementation using Model Context Protocol SDK
 * Supports dynamic toolset registration for multi-platform deployment
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool,
  Resource,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import { logger, getServerConfig } from '../core/index.js';
import type { Toolset, ToolHandler, ResourceReadHandler } from '../toolsets/base/index.js';
import { localToolset } from '../toolsets/local/index.js';

/**
 * Tool response type
 */
interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * OBI MCP Server class with dynamic toolset support
 */
export class ObiMcpServer {
  private server: Server;
  private toolsets: Map<string, Toolset>;
  private tools: Map<string, Tool>;
  private toolHandlers: Map<string, ToolHandler>;
  private resources: Resource[];
  private resourceHandlers: Map<string, ResourceReadHandler>;
  private prompts: Prompt[];
  private promptTemplateGenerators: Map<string, (args?: unknown) => string>;

  constructor() {
    this.server = new Server(
      {
        name: 'obi-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.toolsets = new Map();
    this.tools = new Map();
    this.toolHandlers = new Map();
    this.resources = [];
    this.resourceHandlers = new Map();
    this.prompts = [];
    this.promptTemplateGenerators = new Map();

    this.registerToolsets();
    this.setupHandlers();
  }

  /**
   * Register all enabled toolsets based on configuration
   */
  private registerToolsets(): void {
    const config = getServerConfig();

    logger.info('Registering toolsets...');

    // Register local toolset if enabled
    if (config.toolsets?.local?.enabled !== false) {
      this.registerToolset(localToolset);
    }

    // Future toolsets will be registered here
    // if (config.toolsets?.kubernetes?.enabled) {
    //   this.registerToolset(kubernetesToolset);
    // }
    // if (config.toolsets?.docker?.enabled) {
    //   this.registerToolset(dockerToolset);
    // }

    logger.info(`Registered ${this.toolsets.size} toolset(s)`);
  }

  /**
   * Register a single toolset
   */
  private registerToolset(toolset: Toolset): void {
    logger.info(`Registering toolset: ${toolset.name}`);

    // Add to toolsets map
    this.toolsets.set(toolset.name, toolset);

    // Register all tools from this toolset
    const tools = toolset.getTools();
    tools.forEach((tool) => {
      this.tools.set(tool.name, tool);
      const handler = toolset.getToolHandler(tool.name);
      if (handler) {
        this.toolHandlers.set(tool.name, handler);
      }
    });

    // Register all resources from this toolset
    const resources = toolset.getResources();
    resources.forEach((resource) => {
      this.resources.push(resource);
    });

    // Register resource read handler
    const resourceReadHandler = toolset.getResourceReadHandler();
    if (resourceReadHandler) {
      // Map all resource URIs to this handler
      resources.forEach((resource) => {
        this.resourceHandlers.set(resource.uri, resourceReadHandler);
      });
    }

    // Register all prompts from this toolset
    const prompts = toolset.getPrompts();
    prompts.forEach((prompt) => {
      this.prompts.push(prompt);
      const generator = toolset.getPromptTemplateGenerator(prompt.name);
      if (generator) {
        this.promptTemplateGenerators.set(prompt.name, generator);
      }
    });

    logger.info(
      `[${toolset.name}] Registered ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts`
    );
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling ListTools request');
      return {
        tools: Array.from(this.tools.values()),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Handling CallTool request: ${name}`);

      const handler = this.toolHandlers.get(name);
      if (!handler) {
        logger.warn(`Tool not found: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args);
        return result;
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Handling ListResources request');
      return {
        resources: this.resources,
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      logger.info(`Handling ReadResource request: ${uri}`);

      const handler = this.resourceHandlers.get(uri);
      if (!handler) {
        logger.warn(`Resource handler not found for URI: ${uri}`);
        throw new Error(`Unknown resource URI: ${uri}`);
      }

      try {
        const result = await handler(uri);
        return result;
      } catch (error) {
        logger.error(`Error reading resource ${uri}:`, error);
        throw error;
      }
    });

    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.debug('Handling ListPrompts request');
      return {
        prompts: this.prompts,
      };
    });

    // Handle prompt retrieval
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Handling GetPrompt request: ${name}`);

      const generator = this.promptTemplateGenerators.get(name);
      if (!generator) {
        logger.warn(`Prompt template generator not found: ${name}`);
        throw new Error(`Unknown prompt: ${name}`);
      }

      try {
        const template = generator(args);
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: template,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting prompt ${name}:`, error);
        throw error;
      }
    });

    logger.info('MCP request handlers configured');
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    logger.info('Starting OBI MCP Server...');

    // Initialize all toolsets
    for (const [name, toolset] of this.toolsets) {
      if (toolset.initialize) {
        logger.info(`Initializing toolset: ${name}`);
        await toolset.initialize();
      }
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('OBI MCP Server started successfully');
    logger.info(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
    logger.info(`Registered toolsets: ${Array.from(this.toolsets.keys()).join(', ')}`);
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping OBI MCP Server...');

    // Cleanup all toolsets
    for (const [name, toolset] of this.toolsets) {
      if (toolset.cleanup) {
        logger.info(`Cleaning up toolset: ${name}`);
        await toolset.cleanup();
      }
    }

    await this.server.close();
    logger.info('OBI MCP Server stopped');
  }

  /**
   * Test helper: List available tools
   * @internal For testing only
   */
  async _testListTools(): Promise<{ tools: Tool[] }> {
    return {
      tools: Array.from(this.tools.values()),
    };
  }

  /**
   * Test helper: Call a tool directly
   * @internal For testing only
   */
  async _testCallTool(name: string, args: unknown): Promise<ToolResponse> {
    const handler = this.toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await handler(args);
  }

  /**
   * Test helper: List available resources
   * @internal For testing only
   */
  async _testListResources(): Promise<{ resources: Resource[] }> {
    return {
      resources: this.resources,
    };
  }

  /**
   * Test helper: Read a resource directly
   * @internal For testing only
   */
  async _testReadResource(uri: string): Promise<{
    contents: Array<{ uri: string; mimeType: string; text?: string }>;
  }> {
    const handler = this.resourceHandlers.get(uri);
    if (!handler) {
      throw new Error(`Unknown resource URI: ${uri}`);
    }
    return await handler(uri);
  }

  /**
   * Test helper: List available prompts
   * @internal For testing only
   */
  async _testListPrompts(): Promise<{ prompts: Prompt[] }> {
    return {
      prompts: this.prompts,
    };
  }

  /**
   * Test helper: Get a prompt template
   * @internal For testing only
   */
  async _testGetPrompt(name: string, args?: unknown): Promise<{
    messages: Array<{
      role: string;
      content: { type: string; text: string };
    }>;
  }> {
    const generator = this.promptTemplateGenerators.get(name);
    if (!generator) {
      throw new Error(`Unknown prompt: ${name}`);
    }
    const template = generator(args);
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: template,
          },
        },
      ],
    };
  }
}

/**
 * Create and export server instance
 */
export function createServer(): ObiMcpServer {
  return new ObiMcpServer();
}
