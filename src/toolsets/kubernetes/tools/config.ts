import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import YAML from 'yaml';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';

export const k8sConfigTool: Tool = {
  name: 'obi_k8s_config',
  description: 'Update OBI ConfigMap in Kubernetes',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      config: { type: 'object' },
      otlpEndpoint: { type: 'string' },
      merge: { type: 'boolean', default: true },
      restart: { type: 'boolean', default: false },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
    },
  },
};

const K8sConfigArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  config: z.record(z.unknown()).optional(),
  otlpEndpoint: z.string().optional(),
  merge: z.boolean().optional().default(true),
  restart: z.boolean().optional().default(false),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
});

export type K8sConfigArgs = z.infer<typeof K8sConfigArgsSchema>;

export async function handleK8sConfig(args: unknown) {
  try {
    const validatedArgs = K8sConfigArgsSchema.parse(args);
    const kubectl = createKubectlClient({
      namespace: validatedArgs.namespace,
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    });

    const configMap = await kubectl.getConfigMap('obi-config', { namespace: validatedArgs.namespace });
    const currentData = configMap.data || {};

    const newData: Record<string, string> = {};
    if (validatedArgs.otlpEndpoint) {
      newData['otlp-endpoint'] = validatedArgs.otlpEndpoint;
    }

    let newConfig = validatedArgs.config || {};
    if (validatedArgs.merge && currentData['obi-config.yml']) {
      const current = YAML.parse(currentData['obi-config.yml']);
      newConfig = { ...current, ...newConfig };
    }

    newData['obi-config.yml'] = YAML.stringify(newConfig);

    await kubectl.createConfigMap('obi-config', newData, { namespace: validatedArgs.namespace });

    let text = `=== OBI Config Updated ===\n\nNamespace: \${validatedArgs.namespace}\nMode: \${validatedArgs.merge ? 'Merge' : 'Replace'}\n`;

    if (validatedArgs.restart) {
      text += '\nRestarting pods (not fully implemented - delete pods manually)';
    } else {
      text += '\nNote: Restart required for changes to take effect';
    }

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    logger.error('Config error', { error });
    return {
      content: [{ type: 'text', text: `Error: \${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
