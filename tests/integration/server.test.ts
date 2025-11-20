/**
 * Integration Tests for OBI MCP Server
 * Tests full server lifecycle, tool/resource/prompt registration, and request handling
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { ObiMcpServer } from '../../src/server/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import obiManager from '../../src/toolsets/local/obi-manager.js';
import { ObiStatus } from '../../src/types/obi.js';

// Mock the ObiManager to avoid requiring actual OBI binary
vi.mock('../../src/toolsets/local/obi-manager.js', () => {
  const mockManager = {
    getStatus: vi.fn(),
    deployLocal: vi.fn(),
    stop: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getLogs: vi.fn(),
  };
  return {
    default: mockManager,
  };
});

// Mock the stdio transport since we're testing in-process
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    close: vi.fn(),
  })),
}));

describe('MCP Server Integration', () => {
  let server: ObiMcpServer;

  beforeAll(() => {
    // Disable Docker and Kubernetes toolsets for integration tests
    process.env.ENABLE_DOCKER_TOOLSET = 'false';
    process.env.ENABLE_K8S_TOOLSET = 'false';
    server = new ObiMcpServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should create server instance with correct metadata', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(ObiMcpServer);
    });

    it('should initialize with proper capabilities', () => {
      // Access the private server through type assertion for testing
      const serverInstance = (server as any).server as Server;
      expect(serverInstance).toBeDefined();
    });
  });

  describe('Tool Registration', () => {
    it('should register all 6 tools', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.size).toBe(6);
    });

    it('should register obi_get_status tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_get_status')).toBe(true);
    });

    it('should register obi_deploy_local tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_deploy_local')).toBe(true);
    });

    it('should register obi_get_config tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_get_config')).toBe(true);
    });

    it('should register obi_update_config tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_update_config')).toBe(true);
    });

    it('should register obi_get_logs tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_get_logs')).toBe(true);
    });

    it('should register obi_stop tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      expect(tools.has('obi_stop')).toBe(true);
    });

    it('should have handler for each registered tool', () => {
      const tools = (server as any).tools as Map<string, any>;
      const handlers = (server as any).toolHandlers as Map<string, any>;

      expect(handlers.size).toBe(tools.size);

      for (const toolName of tools.keys()) {
        expect(handlers.has(toolName)).toBe(true);
      }
    });

    it('should have valid tool definitions with required fields', () => {
      const tools = (server as any).tools as Map<string, any>;

      for (const [name, tool] of tools.entries()) {
        expect(tool).toHaveProperty('name', name);
        expect(tool).toHaveProperty('description');
        expect(tool.description).toBeTruthy();
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      }
    });
  });

  describe('Resource Registration', () => {
    it('should register all 3 resources', async () => {
      // Use test helper method
      const result = await (server as any)._testListResources();
      expect(result).toHaveProperty('resources');
      expect(result.resources).toHaveLength(3);
    });

    it('should register obi://config/current resource', async () => {
      const result = await (server as any)._testListResources();

      const configResource = result.resources.find((r: any) => r.uri === 'obi://config/current');
      expect(configResource).toBeDefined();
      expect(configResource.name).toBe('Current OBI Configuration');
      expect(configResource.mimeType).toBe('application/json');
    });

    it('should register obi://status/health resource', async () => {
      const result = await (server as any)._testListResources();

      const healthResource = result.resources.find((r: any) => r.uri === 'obi://status/health');
      expect(healthResource).toBeDefined();
      expect(healthResource.name).toBe('OBI Process Health');
      expect(healthResource.mimeType).toBe('application/json');
    });

    it('should register obi://logs/recent resource', async () => {
      const result = await (server as any)._testListResources();

      const logsResource = result.resources.find((r: any) => r.uri === 'obi://logs/recent');
      expect(logsResource).toBeDefined();
      expect(logsResource.name).toBe('Recent OBI Logs');
      expect(logsResource.mimeType).toBe('text/plain');
    });
  });

  describe('Prompt Registration', () => {
    it('should register setup-obi-local prompt', async () => {
      const result = await (server as any)._testListPrompts();
      expect(result).toHaveProperty('prompts');
      expect(result.prompts).toHaveLength(1);
      expect(result.prompts[0].name).toBe('setup-obi-local');
    });
  });

  describe('Request Handling - Tools', () => {
    it('should handle ListTools request', async () => {
      const result = await (server as any)._testListTools();
      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBe(6);
    });

    it('should handle CallTool request for obi_get_status', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
        uptime: 3600,
        cpuUsage: 5.2,
        memoryUsage: 150.5,
      });

      const result = await (server as any)._testCallTool('obi_get_status', { verbose: true });
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('OBI Status');
    });

    it('should throw error for unknown tool', async () => {
      await expect((server as any)._testCallTool('unknown_tool', {})).rejects.toThrow(
        'Unknown tool: unknown_tool'
      );
    });
  });

  describe('Request Handling - Resources', () => {
    it('should handle ListResources request', async () => {
      const result = await (server as any)._testListResources();
      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBe(3);
    });

    it('should handle ReadResource request for valid URI', async () => {
      vi.mocked(obiManager.getStatus).mockResolvedValue({
        status: ObiStatus.RUNNING,
        pid: 12345,
      });

      const result = await (server as any)._testReadResource('obi://status/health');
      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents[0]).toHaveProperty('uri', 'obi://status/health');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');
    });

    it('should throw error for unknown resource URI', async () => {
      await expect((server as any)._testReadResource('obi://unknown/resource')).rejects.toThrow(
        'Unknown resource URI'
      );
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors from tool handlers', async () => {
      vi.mocked(obiManager.getStatus).mockRejectedValue(new Error('Process lookup failed'));

      // Tool handlers catch errors and return them in the response with isError: true
      const result = await (server as any)._testCallTool('obi_get_status', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Process lookup failed');
    });

    it('should propagate errors from resource handlers', async () => {
      vi.mocked(obiManager.getConfig).mockRejectedValue(new Error('Config read failed'));

      await expect((server as any)._testReadResource('obi://config/current')).rejects.toThrow(
        'Config read failed'
      );
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      // Server start is async and connects to stdio transport
      // In test environment, we just verify it doesn't throw
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should stop server gracefully', async () => {
      await expect(server.stop()).resolves.not.toThrow();
    });
  });
});
