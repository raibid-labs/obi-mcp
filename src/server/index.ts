/**
 * OBI MCP Server
 * Main server implementation using Model Context Protocol SDK
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
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';
import logger from '../utils/logger.js';
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
} from '../tools/index.js';
import { listResources, handleResourceRead } from '../resources/index.js';
import { prompts, getPromptTemplate } from '../prompts/index.js';

/**
 * OBI MCP Server class
 */
export class ObiMcpServer {
  private server: Server;
  private tools: Map<string, Tool>;
  private toolHandlers: Map<string, (args: unknown) => Promise<any>>;
  private prompts: Prompt[];

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

    this.tools = new Map();
    this.toolHandlers = new Map();
    this.prompts = prompts;

    this.setupTools();
    this.setupHandlers();
  }

  /**
   * Register all available tools
   */
  private setupTools(): void {
    // Register all OBI tools
    this.tools.set(getStatusTool.name, getStatusTool);
    this.toolHandlers.set(getStatusTool.name, handleGetStatus);

    this.tools.set(getConfigTool.name, getConfigTool);
    this.toolHandlers.set(getConfigTool.name, handleGetConfig);

    this.tools.set(getLogsTool.name, getLogsTool);
    this.toolHandlers.set(getLogsTool.name, handleGetLogs);

    this.tools.set(getDeployLocalTool.name, getDeployLocalTool);
    this.toolHandlers.set(getDeployLocalTool.name, handleDeployLocal);

    this.tools.set(updateConfigTool.name, updateConfigTool);
    this.toolHandlers.set(updateConfigTool.name, handleUpdateConfig);

    this.tools.set(stopTool.name, stopTool);
    this.toolHandlers.set(stopTool.name, handleStop);

    logger.info(`Registered ${this.tools.size} tools`);
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
      return listResources();
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      logger.info(`Handling ReadResource request: ${uri}`);

      try {
        const result = await handleResourceRead(uri);
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

      try {
        const template = getPromptTemplate(name, args);
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

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info('OBI MCP Server started successfully');
    logger.info(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping OBI MCP Server...');
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
  async _testCallTool(name: string, args: unknown): Promise<any> {
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
  async _testListResources(): Promise<{ resources: any[] }> {
    return listResources();
  }

  /**
   * Test helper: Read a resource directly
   * @internal For testing only
   */
  async _testReadResource(uri: string): Promise<any> {
    return await handleResourceRead(uri);
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
  async _testGetPrompt(name: string, args?: unknown): Promise<any> {
    const template = getPromptTemplate(name, args);
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
