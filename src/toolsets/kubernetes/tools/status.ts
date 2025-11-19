import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';

export const k8sStatusTool: Tool = {
  name: 'obi_k8s_status',
  description: 'Get OBI deployment status in Kubernetes cluster',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      verbose: { type: 'boolean', default: false },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
    },
  },
};

const K8sStatusArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  verbose: z.boolean().optional().default(false),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
});

export type K8sStatusArgs = z.infer<typeof K8sStatusArgsSchema>;

export async function handleK8sStatus(args: unknown) {
  try {
    const validatedArgs = K8sStatusArgsSchema.parse(args);
    const kubectl = createKubectlClient({
      namespace: validatedArgs.namespace,
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    });

    const connectivity = await kubectl.checkConnectivity();
    if (!connectivity.connected) {
      throw new Error(`Cannot connect to cluster: ${connectivity.error}`);
    }

    const namespaceExists = await kubectl.namespaceExists(validatedArgs.namespace);
    if (!namespaceExists) {
      return {
        content: [{ type: 'text', text: `OBI not deployed in namespace ${validatedArgs.namespace}` }],
      };
    }

    const pods = await kubectl.getPods('app=obi', { namespace: validatedArgs.namespace });
    const nodes = await kubectl.getNodes();

    if (pods.length === 0) {
      return {
        content: [{ type: 'text', text: `OBI not deployed in namespace ${validatedArgs.namespace}` }],
      };
    }

    const runningPods = pods.filter(p => p.status === 'Running').length;
    const _health = runningPods === nodes.length ? 'HEALTHY' : 'DEGRADED';

    let text = `=== OBI Kubernetes Status ===\n\nStatus: ${_health}\nPods: ${pods.length}/${nodes.length}\nRunning: ${runningPods}\n`;

    if (validatedArgs.verbose) {
      text += `\n--- Pod Details ---\n`;
      pods.forEach(_pod => {
        text += `${_pod.name}: ${_pod.status} (${_pod.ready}) on ${_pod.node}\n`;
      });
    }

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    logger.error('Status error', { error });
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
