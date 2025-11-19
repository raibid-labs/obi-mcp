import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';

export const k8sLogsTool: Tool = {
  name: 'obi_k8s_logs',
  description: 'Get aggregated logs from OBI pods',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      podName: { type: 'string' },
      tail: { type: 'number', default: 100 },
      since: { type: 'string' },
      timestamps: { type: 'boolean', default: true },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
    },
  },
};

const K8sLogsArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  podName: z.string().optional(),
  tail: z.number().optional().default(100),
  since: z.string().optional(),
  timestamps: z.boolean().optional().default(true),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
});

export type K8sLogsArgs = z.infer<typeof K8sLogsArgsSchema>;

export async function handleK8sLogs(args: unknown) {
  try {
    const validatedArgs = K8sLogsArgsSchema.parse(args);
    const kubectl = createKubectlClient({
      namespace: validatedArgs.namespace,
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    });

    const pods = validatedArgs.podName
      ? [{ name: validatedArgs.podName, node: 'unknown' }]
      : await kubectl.getPods('app=obi', { namespace: validatedArgs.namespace });

    if (pods.length === 0) {
      return {
        content: [{ type: 'text', text: `No OBI pods found in namespace ${validatedArgs.namespace}` }],
      };
    }

    const logPromises = pods.map(async pod => {
      try {
        const _logs = await kubectl.logs(pod.name, {
          namespace: validatedArgs.namespace,
          tail: validatedArgs.tail,
          since: validatedArgs.since,
          timestamps: validatedArgs.timestamps,
        });
        return `\n=== ${pod.name} ===\n${_logs}`;
      } catch (error) {
        return `\n=== ${pod.name} ===\nError: ${error}`;
      }
    });

    const _allLogs = await Promise.all(logPromises);
    const text = `=== OBI Kubernetes Logs ===\n\nNamespace: ${validatedArgs.namespace}\nPods: ${pods.length}\n${_allLogs.join('\n')}`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    logger.error('Logs error', { error });
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
