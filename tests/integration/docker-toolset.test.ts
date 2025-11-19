/**
 * Docker Toolset Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DockerToolset } from '../../src/toolsets/docker/index.js';

describe('DockerToolset Integration', () => {
  let toolset: DockerToolset;

  beforeEach(() => {
    toolset = new DockerToolset();
  });

  describe('Tool Registration', () => {
    it('should register all 5 Docker tools', () => {
      const tools = toolset.getTools();
      expect(tools).toHaveLength(5);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('obi_docker_deploy');
      expect(toolNames).toContain('obi_docker_status');
      expect(toolNames).toContain('obi_docker_logs');
      expect(toolNames).toContain('obi_docker_stop');
      expect(toolNames).toContain('obi_docker_compose');
    });

    it('should have handlers for all tools', () => {
      const tools = toolset.getTools();

      tools.forEach((tool) => {
        const handler = toolset.getToolHandler(tool.name);
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      });
    });

    it('should have proper tool schemas', () => {
      const tools = toolset.getTools();

      tools.forEach((tool) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('Resource Registration', () => {
    it('should register 3 Docker resources', () => {
      const resources = toolset.getResources();
      expect(resources).toHaveLength(3);

      const uris = resources.map((r) => r.uri);
      expect(uris).toContain('obi-docker://status/current');
      expect(uris).toContain('obi-docker://logs/recent');
      expect(uris).toContain('obi-docker://compose/template');
    });

    it('should recognize resource URIs', () => {
      expect(toolset.hasResource('obi-docker://status/current')).toBe(true);
      expect(toolset.hasResource('obi-docker://logs/recent')).toBe(true);
      expect(toolset.hasResource('obi-docker://compose/template')).toBe(true);
      expect(toolset.hasResource('obi-docker://invalid')).toBe(false);
    });
  });

  describe('Prompt Registration', () => {
    it('should register setup-obi-docker prompt', () => {
      const prompts = toolset.getPrompts();
      expect(prompts).toHaveLength(1);

      expect(prompts[0].name).toBe('setup-obi-docker');
      expect(prompts[0].description).toContain('Guided setup');
    });

    it('should recognize prompt names', () => {
      expect(toolset.hasPrompt('setup-obi-docker')).toBe(true);
      expect(toolset.hasPrompt('invalid-prompt')).toBe(false);
    });

    it('should generate prompt templates', () => {
      const template = toolset.getPromptTemplate('setup-obi-docker', {
        environment: 'development',
      });

      expect(template).toContain('# OBI Docker Deployment Setup');
      expect(template).toContain('Environment: development');
    });
  });

  describe('Tool Discovery', () => {
    it('should identify Docker tools', () => {
      expect(toolset.hasTool('obi_docker_deploy')).toBe(true);
      expect(toolset.hasTool('obi_docker_status')).toBe(true);
      expect(toolset.hasTool('obi_get_status')).toBe(false);
    });
  });
});
