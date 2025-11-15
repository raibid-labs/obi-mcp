/**
 * Prompts Module
 * Exports all available MCP prompts
 */

import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { setupLocalPrompt, getSetupLocalPromptTemplate } from './setup-local.js';

/**
 * All available prompts
 */
export const prompts: Prompt[] = [
  setupLocalPrompt,
];

/**
 * Prompt template generators
 */
export const promptTemplates: Record<string, (args?: unknown) => string> = {
  'setup-obi-local': (args) => getSetupLocalPromptTemplate(args as { environment?: string }),
};

/**
 * Get prompt by name
 */
export function getPrompt(name: string): Prompt | undefined {
  return prompts.find(p => p.name === name);
}

/**
 * Get prompt template
 */
export function getPromptTemplate(name: string, args?: unknown): string {
  const generator = promptTemplates[name];
  if (!generator) {
    throw new Error(`Prompt template not found: ${name}`);
  }
  return generator(args);
}

// Re-export individual prompts
export { setupLocalPrompt, getSetupLocalPromptTemplate };
