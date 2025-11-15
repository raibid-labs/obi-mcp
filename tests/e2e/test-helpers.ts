/**
 * E2E Test Helper Utilities
 * Common functions for parsing and validating tool responses
 */

import { ObiMcpServer } from '../../src/server/index.js';

/**
 * Helper to call tools
 */
export async function callTool(server: ObiMcpServer, name: string, args: any = {}) {
  return await server._testCallTool(name, args);
}

/**
 * Helper to read resources
 */
export async function readResource(server: ObiMcpServer, uri: string) {
  return await server._testReadResource(uri);
}

/**
 * Extract text content from tool result
 */
export function extractTextContent(result: any): string {
  if (result.content && result.content[0] && result.content[0].text) {
    return result.content[0].text;
  }
  return '';
}

/**
 * Parse status tool response
 * Handles the formatted text output from obi_get_status
 */
export function parseStatusResponse(text: string): {
  status: string;
  pid?: number;
  uptime?: string;
  details?: Record<string, string>;
  lastError?: string;
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: any = {};

  for (const line of lines) {
    // Skip headers
    if (line.startsWith('===') || line.startsWith('---')) {
      continue;
    }

    // Parse key-value pairs
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].toLowerCase().trim();
      const value = match[2].trim();

      if (key === 'status') {
        result.status = value;
      } else if (key === 'pid') {
        result.pid = parseInt(value, 10);
      } else if (key === 'uptime') {
        result.uptime = value;
      } else if (key.includes('error')) {
        result.lastError = value;
      } else if (!result.details) {
        result.details = {};
      }
    }
  }

  return result;
}

/**
 * Check if tool response indicates success
 */
export function isSuccessResponse(result: any): boolean {
  if (result.isError) {
    return false;
  }
  const text = extractTextContent(result).toLowerCase();
  return text.includes('success') || (!text.includes('error') && !text.includes('failed'));
}

/**
 * Check if tool response indicates error
 */
export function isErrorResponse(result: any): boolean {
  if (result.isError) {
    return true;
  }
  const text = extractTextContent(result).toLowerCase();
  return text.includes('error') || text.includes('failed');
}

/**
 * Parse config tool response
 * Tries to extract JSON if present, otherwise returns text
 */
export function parseConfigResponse(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Not valid JSON, return text
    }
  }

  // Check if it's a plain "No config" message
  if (text.includes('No') || text.includes('not') || text.includes('available')) {
    return null;
  }

  return text;
}
