/**
 * Helm Install Tool
 * Install OBI using Helm chart
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { helmClient } from '../helm-client.js';
import logger from '../../../utils/logger.js';

/**
 * Schema for helm install arguments
 */
export const HelmInstallArgsSchema = z.object({
  release: z.string().optional().default('obi'),
  namespace: z.string().optional().default('default'),
  values: z.record(z.any()).optional(),
  version: z.string().optional(),
  createNamespace: z.boolean().optional().default(true),
  wait: z.boolean().optional().default(true),
  timeout: z.string().optional().default('5m'),
  chart: z.string().optional().default('oci://ghcr.io/raibid-labs/charts/obi'),
});

export type HelmInstallArgs = z.infer<typeof HelmInstallArgsSchema>;

/**
 * Helm Install Tool Definition
 */
export const helmInstallTool: Tool = {
  name: 'obi_k8s_helm_install',
  description: `Install OBI using Helm chart with custom values.

This tool deploys OBI to Kubernetes using Helm, providing a production-ready deployment
with configurable values for OTLP endpoint, ports, resources, and more.

Examples:
- Basic install: { namespace: "observability" }
- Custom endpoint: { values: { obi: { otlpEndpoint: "http://jaeger:4317" } } }
- Custom resources: { values: { resources: { limits: { memory: "1Gi" } } } }
- Specific version: { version: "0.1.0", namespace: "observability" }`,
  inputSchema: {
    type: 'object',
    properties: {
      release: {
        type: 'string',
        description: 'Helm release name',
        default: 'obi',
      },
      namespace: {
        type: 'string',
        description: 'Kubernetes namespace',
        default: 'default',
      },
      values: {
        type: 'object',
        description: 'Custom values to override chart defaults',
      },
      version: {
        type: 'string',
        description: 'Specific chart version to install',
      },
      createNamespace: {
        type: 'boolean',
        description: 'Create namespace if it does not exist',
        default: true,
      },
      wait: {
        type: 'boolean',
        description: 'Wait for pods to be ready',
        default: true,
      },
      timeout: {
        type: 'string',
        description: 'Timeout for installation (e.g., 5m, 10m)',
        default: '5m',
      },
      chart: {
        type: 'string',
        description: 'Helm chart location',
        default: 'oci://ghcr.io/raibid-labs/charts/obi',
      },
    },
  },
};

/**
 * Handle helm install execution
 */
export async function handleHelmInstall(args: unknown): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    const validatedArgs = HelmInstallArgsSchema.parse(args);
    logger.info('Installing OBI via Helm', {
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
      chart: validatedArgs.chart,
    });

    // Check if Helm is installed
    const helmCheck = await helmClient.checkHelm();
    if (!helmCheck.installed) {
      throw new Error(
        'Helm is not installed. Please install Helm 3.0+ from https://helm.sh/docs/intro/install/'
      );
    }

    // Install the chart
    await helmClient.install({
      chart: validatedArgs.chart,
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
      values: validatedArgs.values,
      version: validatedArgs.version,
      createNamespace: validatedArgs.createNamespace,
      wait: validatedArgs.wait,
      timeout: validatedArgs.timeout,
    });

    // Get status after installation
    const status = await helmClient.status(validatedArgs.release, validatedArgs.namespace);

    const successMessage = `Helm release '${validatedArgs.release}' installed successfully!

Release Information:
- Name: ${status.name}
- Namespace: ${status.namespace}
- Status: ${status.info.status}
- Chart: ${status.config?.image?.repository || 'obi'}:${status.config?.image?.tag || 'main'}
- First Deployed: ${status.info.first_deployed}

Configuration:
- OTLP Endpoint: ${status.config?.obi?.otlpEndpoint || 'http://otel-collector:4317'}
- Instrumented Port: ${status.config?.obi?.openPort || '8080'}
- Network Enabled: ${status.config?.obi?.networkEnabled || 'true'}

${status.info.notes || ''}

Verification Commands:
kubectl get daemonset -n ${validatedArgs.namespace} ${validatedArgs.release}-obi
kubectl get pods -n ${validatedArgs.namespace} -l app.kubernetes.io/name=obi
kubectl logs -n ${validatedArgs.namespace} -l app.kubernetes.io/name=obi --tail=50`;

    logger.info('Helm install completed successfully', {
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
    });

    return {
      content: [
        {
          type: 'text',
          text: successMessage,
        },
      ],
    };
  } catch (error: any) {
    logger.error('Helm install failed', { error: error.message });

    const errorMessage = `Failed to install OBI via Helm: ${error.message}

Common issues:
1. Helm not installed - Install from https://helm.sh/docs/intro/install/
2. Insufficient permissions - Ensure you have cluster-admin rights
3. Chart not found - Verify chart repository is accessible
4. Namespace issues - Check if namespace exists or use createNamespace: true
5. Resource limits - Ensure cluster has sufficient resources

Troubleshooting:
- Check Helm version: helm version
- List releases: helm list -A
- Check logs: kubectl logs -n ${(args as any)?.namespace || 'default'} -l app.kubernetes.io/name=obi

Error details: ${error.stderr || error.message}`;

    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
        },
      ],
    };
  }
}
