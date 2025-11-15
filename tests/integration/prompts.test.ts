/**
 * Integration Tests for MCP Prompts
 * Tests prompt listing, retrieval, and template generation
 */

import { describe, it, expect } from 'vitest';
import { prompts, getPrompt, getPromptTemplate } from '../../src/prompts/index.js';
import { setupLocalPrompt, getSetupLocalPromptTemplate } from '../../src/prompts/setup-local.js';

describe('Prompts Integration Tests', () => {
  describe('Prompt Listing', () => {
    it('should export all available prompts', () => {
      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts).toHaveLength(1);
    });

    it('should include setup-obi-local prompt', () => {
      const setupPrompt = prompts.find((p) => p.name === 'setup-obi-local');
      expect(setupPrompt).toBeDefined();
    });

    it('should have valid prompt structure', () => {
      prompts.forEach((prompt) => {
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');
        expect(prompt).toHaveProperty('arguments');

        expect(typeof prompt.name).toBe('string');
        expect(typeof prompt.description).toBe('string');
        expect(Array.isArray(prompt.arguments)).toBe(true);
      });
    });
  });

  describe('Setup Local Prompt', () => {
    it('should have correct metadata', () => {
      expect(setupLocalPrompt.name).toBe('setup-obi-local');
      expect(setupLocalPrompt.description).toContain('OBI');
      expect(setupLocalPrompt.description).toContain('local');
      expect(setupLocalPrompt.arguments).toHaveLength(1);
    });

    it('should define environment argument', () => {
      const envArg = setupLocalPrompt.arguments?.find((arg) => arg.name === 'environment');

      expect(envArg).toBeDefined();
      expect(envArg?.description).toContain('environment');
      expect(envArg?.required).toBe(false);
    });

    it('should be retrievable by name', () => {
      const prompt = getPrompt('setup-obi-local');

      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('setup-obi-local');
    });

    it('should return undefined for unknown prompt', () => {
      const prompt = getPrompt('unknown-prompt');
      expect(prompt).toBeUndefined();
    });
  });

  describe('Prompt Template Generation', () => {
    it('should generate template without arguments (default development)', () => {
      const template = getPromptTemplate('setup-obi-local');

      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(0);
    });

    it('should generate template for development environment', () => {
      const template = getPromptTemplate('setup-obi-local', { environment: 'development' });

      expect(template).toContain('OBI Local Deployment Setup Guide');
      expect(template).toContain('Prerequisites Check');
      expect(template).toContain('Configuration Setup');
      expect(template).toContain('Deployment Options');
      expect(template).toContain('Verification');
      expect(template).toContain('Troubleshooting');
    });

    it('should generate template for production environment', () => {
      const template = getPromptTemplate('setup-obi-local', { environment: 'production' });

      expect(template).toContain('OBI Local Deployment Setup Guide');
      expect(template).toContain('Production Checklist');
      expect(template).toContain('TLS enabled');
      expect(template).toContain('Security audit');
    });

    it('should throw error for unknown prompt template', () => {
      expect(() => getPromptTemplate('unknown-prompt')).toThrow(
        'Prompt template not found: unknown-prompt'
      );
    });
  });

  describe('Template Content - Development Mode', () => {
    let devTemplate: string;

    beforeEach(() => {
      devTemplate = getSetupLocalPromptTemplate({ environment: 'development' });
    });

    it('should include kernel requirements', () => {
      expect(devTemplate).toContain('Linux Kernel');
      expect(devTemplate).toContain('5.8 or higher');
      expect(devTemplate).toContain('uname -r');
    });

    it('should include sudo access requirement', () => {
      expect(devTemplate).toContain('Sudo Access');
      expect(devTemplate).toContain('sudo -v');
    });

    it('should include configuration template', () => {
      expect(devTemplate).toContain('Configuration File Location');
      expect(devTemplate).toContain('./obi-config.yaml');
      expect(devTemplate).toContain('instrumentation');
      expect(devTemplate).toContain('exporters');
    });

    it('should include development-specific settings', () => {
      expect(devTemplate).toContain('auto_instrument: true');
      expect(devTemplate).toContain('level: "debug"');
      expect(devTemplate).toContain('TLS disabled for development');
    });

    it('should include binary deployment instructions', () => {
      expect(devTemplate).toContain('Binary Deployment');
      expect(devTemplate).toContain('curl -Lo obi');
      expect(devTemplate).toContain('chmod +x obi');
      expect(devTemplate).toContain('./obi --version');
    });

    it('should include Docker deployment instructions', () => {
      expect(devTemplate).toContain('Docker Deployment');
      expect(devTemplate).toContain('docker pull');
      expect(devTemplate).toContain('docker run');
      expect(devTemplate).toContain('--privileged');
    });

    it('should include verification steps', () => {
      expect(devTemplate).toContain('Verification');
      expect(devTemplate).toContain('ps aux | grep obi');
      expect(devTemplate).toContain('bpftool prog list');
    });

    it('should include troubleshooting section', () => {
      expect(devTemplate).toContain('Troubleshooting');
      expect(devTemplate).toContain('Permission Denied');
      expect(devTemplate).toContain('Kernel Version Too Old');
      expect(devTemplate).toContain('eBPF Programs Not Loading');
      expect(devTemplate).toContain('No Telemetry Data');
    });

    it('should not include production checklist', () => {
      expect(devTemplate).not.toContain('Production Checklist');
    });
  });

  describe('Template Content - Production Mode', () => {
    let prodTemplate: string;

    beforeEach(() => {
      prodTemplate = getSetupLocalPromptTemplate({ environment: 'production' });
    });

    it('should include production-specific configuration', () => {
      expect(prodTemplate).toContain('/etc/obi/config.yaml');
      expect(prodTemplate).toContain('auto_instrument: false');
      expect(prodTemplate).toContain('level: "info"');
    });

    it('should include TLS configuration', () => {
      expect(prodTemplate).toContain('tls:');
      expect(prodTemplate).toContain('enabled: true');
      expect(prodTemplate).toContain('cert_file');
    });

    it('should include system-wide installation', () => {
      expect(prodTemplate).toContain('sudo mv obi /usr/local/bin/');
      expect(prodTemplate).toContain('sudo obi start');
    });

    it('should include production checklist', () => {
      expect(prodTemplate).toContain('Production Checklist');
      expect(prodTemplate).toContain('TLS enabled for OTLP export');
      expect(prodTemplate).toContain('Configuration file secured');
      expect(prodTemplate).toContain('Systemd service configured');
      expect(prodTemplate).toContain('Log rotation set up');
      expect(prodTemplate).toContain('Resource limits defined');
      expect(prodTemplate).toContain('Monitoring/alerting configured');
      expect(prodTemplate).toContain('Security audit completed');
    });

    it('should include production deployment recommendations', () => {
      expect(prodTemplate).toContain('Recommended for production');
    });
  });

  describe('Template Structure and Formatting', () => {
    it('should use markdown formatting', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('# ');
      expect(template).toContain('## ');
      expect(template).toContain('### ');
      expect(template).toContain('```');
      expect(template).toContain('- ');
      expect(template).toContain('---');
    });

    it('should have step-by-step structure', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Step 1:');
      expect(template).toContain('Step 2:');
      expect(template).toContain('Step 3:');
      expect(template).toContain('Step 4:');
      expect(template).toContain('Step 5:');
    });

    it('should include code blocks for commands', () => {
      const template = getSetupLocalPromptTemplate();

      const codeBlocks = template.match(/```bash/g);
      expect(codeBlocks).not.toBeNull();
      expect(codeBlocks!.length).toBeGreaterThan(5);
    });

    it('should include actionable instructions', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('**Action**:');
    });

    it('should have proper section separators', () => {
      const template = getSetupLocalPromptTemplate();

      const separators = template.match(/---/g);
      expect(separators).not.toBeNull();
      expect(separators!.length).toBeGreaterThan(3);
    });
  });

  describe('Dynamic Template Generation', () => {
    it('should handle undefined arguments gracefully', () => {
      const template = getSetupLocalPromptTemplate(undefined);

      expect(template).toBeDefined();
      expect(template).toContain('development');
    });

    it('should handle empty arguments object', () => {
      const template = getSetupLocalPromptTemplate({});

      expect(template).toBeDefined();
      expect(template).toContain('development');
    });

    it('should handle invalid environment value', () => {
      const template = getSetupLocalPromptTemplate({ environment: 'staging' });

      // Should treat as development since it's not 'production'
      expect(template).not.toContain('Production Checklist');
    });

    it('should generate different content for different environments', () => {
      const devTemplate = getSetupLocalPromptTemplate({ environment: 'development' });
      const prodTemplate = getSetupLocalPromptTemplate({ environment: 'production' });

      expect(devTemplate).not.toEqual(prodTemplate);
      expect(devTemplate.length).not.toEqual(prodTemplate.length);
    });
  });

  describe('Template Completeness', () => {
    it('should cover all deployment options', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Option A: Binary Deployment');
      expect(template).toContain('Option B: Docker Deployment');
      expect(template).toContain('Option C: Build from Source');
    });

    it('should provide verification commands', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Check Process Status');
      expect(template).toContain('Verify eBPF Programs');
      expect(template).toContain('Test Instrumentation');
      expect(template).toContain('Check Telemetry Export');
    });

    it('should include troubleshooting for common issues', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Permission Denied');
      expect(template).toContain('Kernel Version Too Old');
      expect(template).toContain('eBPF Programs Not Loading');
      expect(template).toContain('No Telemetry Data');
      expect(template).toContain('High CPU/Memory Usage');
    });

    it('should provide next steps', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Next Steps');
      expect(template).toContain('Configure Instrumentation');
      expect(template).toContain('Set Up Dashboards');
      expect(template).toContain('Alert Configuration');
    });

    it('should include debug instructions', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Debug Mode');
      expect(template).toContain('--log-level debug');
    });

    it('should provide help resources', () => {
      const template = getSetupLocalPromptTemplate();

      expect(template).toContain('Get Help');
      expect(template).toContain('opentelemetry.io');
      expect(template).toContain('github.com');
    });
  });

  describe('Prompt Integration with MCP Server', () => {
    it('should be compatible with MCP prompt schema', () => {
      prompts.forEach((prompt) => {
        // Verify structure matches MCP Prompt type
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');

        if (prompt.arguments) {
          prompt.arguments.forEach((arg) => {
            expect(arg).toHaveProperty('name');
            expect(arg).toHaveProperty('description');
            expect(arg).toHaveProperty('required');
          });
        }
      });
    });

    it('should generate templates that can be used in MCP responses', () => {
      const template = getPromptTemplate('setup-obi-local', { environment: 'development' });

      // Template should be a string that can be returned in an MCP response
      expect(typeof template).toBe('string');
      expect(template.length).toBeGreaterThan(100);

      // Should not contain control characters or invalid content
      expect(template).not.toContain('\x00');
      expect(template).not.toContain('\uFFFD');
    });
  });

  describe('Template Consistency', () => {
    it('should generate identical templates for same arguments', () => {
      const template1 = getSetupLocalPromptTemplate({ environment: 'development' });
      const template2 = getSetupLocalPromptTemplate({ environment: 'development' });

      expect(template1).toBe(template2);
    });

    it('should maintain consistent formatting across environments', () => {
      const devTemplate = getSetupLocalPromptTemplate({ environment: 'development' });
      const prodTemplate = getSetupLocalPromptTemplate({ environment: 'production' });

      // Both should have headers
      expect(devTemplate).toMatch(/^# /m);
      expect(prodTemplate).toMatch(/^# /m);

      // Both should have step sections
      expect(devTemplate).toContain('Step 1:');
      expect(prodTemplate).toContain('Step 1:');

      // Both should have code blocks
      expect(devTemplate).toContain('```bash');
      expect(prodTemplate).toContain('```bash');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent prompt template', () => {
      expect(() => getPromptTemplate('non-existent-prompt')).toThrow();
    });

    it('should provide helpful error message', () => {
      try {
        getPromptTemplate('non-existent-prompt');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Prompt template not found');
        expect((error as Error).message).toContain('non-existent-prompt');
      }
    });
  });
});
