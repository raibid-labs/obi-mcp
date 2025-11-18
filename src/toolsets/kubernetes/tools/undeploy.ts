import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';

export const k8sUndeployTool: Tool = {
  name: 'obi_k8s_undeploy',
  description: 'Remove OBI deployment from Kubernetes cluster',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      keepConfig: { type: 'boolean', default: false },
      deleteNamespace: { type: 'boolean', default: false },
      deleteRbac: { type: 'boolean', default: true },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
    },
  },
};

const K8sUndeployArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  keepConfig: z.boolean().optional().default(false),
  deleteNamespace: z.boolean().optional().default(false),
  deleteRbac: z.boolean().optional().default(true),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
});

export type K8sUndeployArgs = z.infer<typeof K8sUndeployArgsSchema>;

export async function handleK8sUndeploy(args: unknown) {
  try {
    const validatedArgs = K8sUndeployArgsSchema.parse(args);
    const kubectl = createKubectlClient({
      namespace: validatedArgs.namespace,
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    });

    const deleted: string[] = [];

    await kubectl.delete('daemonset', 'obi', { namespace: validatedArgs.namespace });
    deleted.push('DaemonSet: obi');

    if (!validatedArgs.keepConfig) {
      await kubectl.delete('configmap', 'obi-config', { namespace: validatedArgs.namespace });
      deleted.push('ConfigMap: obi-config');
    }

    await kubectl.delete('serviceaccount', 'obi', { namespace: validatedArgs.namespace });
    deleted.push('ServiceAccount: obi');

    if (validatedArgs.deleteRbac) {
      await kubectl.delete('clusterrole', 'obi', {});
      await kubectl.delete('clusterrolebinding', 'obi', {});
      deleted.push('ClusterRole & ClusterRoleBinding');
    }

    if (validatedArgs.deleteNamespace) {
      await kubectl.delete('namespace', validatedArgs.namespace, {});
      deleted.push(`Namespace: \${validatedArgs.namespace}`);
    }

    const deletedList = deleted.map(r => `- ${r}`).join('\n');
    const preserveMsg = validatedArgs.keepConfig ? 'ConfigMap preserved for redeployment' : '';
    const text = `=== OBI Undeployed ===\n\nDeleted Resources:\n${deletedList}\n\n${preserveMsg}`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    logger.error('Undeploy error', { error });
    return {
      content: [{ type: 'text', text: `Error: \${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
