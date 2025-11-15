/**
 * E2E Smoke Tests
 * Quick validation that all MCP features work under normal usage
 * These tests should run fast (<10s) and be suitable for CI
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObiMcpServer } from '../../src/server/index.js';

describe('E2E Smoke Tests', () => {
  let server: ObiMcpServer;

  beforeEach(() => {
    server = new ObiMcpServer();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const result = await server._testListTools();

      expect(result).toHaveProperty('tools');
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);

      // Verify all expected tools are present
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('obi_get_status');
      expect(toolNames).toContain('obi_deploy_local');
      expect(toolNames).toContain('obi_stop');
      expect(toolNames).toContain('obi_get_config');
      expect(toolNames).toContain('obi_update_config');
      expect(toolNames).toContain('obi_get_logs');
    });

    it('should have valid tool definitions', async () => {
      const result = await server._testListTools();

      // Each tool should have required fields
      for (const tool of result.tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      }
    });
  });

  describe('Tool Execution', () => {
    it('should execute obi_get_status without errors', async () => {
      const result = await server._testCallTool('obi_get_status', {});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should handle invalid tool names gracefully', async () => {
      await expect(
        server._testCallTool('nonexistent_tool', {})
      ).rejects.toThrow('Unknown tool');
    });
  });

  describe('Resource Discovery', () => {
    it('should list all available resources', async () => {
      const result = await server._testListResources();

      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBeGreaterThan(0);

      // Verify expected resources
      const uris = result.resources.map((r: any) => r.uri);
      expect(uris).toContain('obi://config/current');
      expect(uris).toContain('obi://status/health');
      expect(uris).toContain('obi://logs/recent');
    });

    it('should have valid resource definitions', async () => {
      const result = await server._testListResources();

      // Each resource should have required fields
      for (const resource of result.resources) {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');

        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
        expect(typeof resource.description).toBe('string');
        expect(typeof resource.mimeType).toBe('string');
      }
    });
  });

  describe('Resource Reading', () => {
    it('should read health status resource', async () => {
      const result = await server._testReadResource('obi://status/health');

      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBeGreaterThan(0);
      expect(result.contents[0]).toHaveProperty('uri', 'obi://status/health');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');

      // Parse and validate JSON structure
      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('running');
      expect(data).toHaveProperty('timestamp');
    });

    it('should read current config resource', async () => {
      const result = await server._testReadResource('obi://config/current');

      expect(result).toHaveProperty('contents');
      expect(result.contents[0]).toHaveProperty('uri', 'obi://config/current');
      expect(result.contents[0]).toHaveProperty('mimeType', 'application/json');
      expect(result.contents[0]).toHaveProperty('text');

      // Should be valid JSON
      expect(() => JSON.parse(result.contents[0].text)).not.toThrow();
    });

    it('should handle invalid resource URIs gracefully', async () => {
      await expect(
        server._testReadResource('obi://invalid/resource')
      ).rejects.toThrow('Unknown resource URI');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop gracefully', async () => {
      const testServer = new ObiMcpServer();

      // Should not throw during lifecycle
      await expect(testServer.stop()).resolves.not.toThrow();
    });

    it('should handle multiple stop calls gracefully', async () => {
      const testServer = new ObiMcpServer();

      await testServer.stop();
      // Second stop should not throw
      await expect(testServer.stop()).resolves.not.toThrow();
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid sequential tool calls', async () => {
      // Make 10 rapid calls
      const promises = Array.from({ length: 10 }, () =>
        server._testCallTool('obi_get_status', {})
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('content');
        expect(result.content[0]).toHaveProperty('type', 'text');
      });
    });

    it('should handle rapid sequential resource reads', async () => {
      // Read different resources rapidly
      const promises = [
        'obi://status/health',
        'obi://config/current',
        'obi://logs/recent'
      ].map(uri => server._testReadResource(uri));

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('contents');
        expect(result.contents).toHaveLength(1);
      });
    });
  });
});
