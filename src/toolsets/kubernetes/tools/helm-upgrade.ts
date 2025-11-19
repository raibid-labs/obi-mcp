/**
 * Helm Upgrade Tool
 * Upgrade OBI Helm release
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { helmClient } from '../helm-client.js';
import logger from '../../../utils/logger.js';

/**
 * Schema for helm upgrade arguments
 */
export const HelmUpgradeArgsSchema = z.object({
  release: z.string().optional().default('obi'),
  namespace: z.string().optional().default('default'),
  values: z.record(z.any()).optional(),
  version: z.string().optional(),
  install: z.boolean().optional().default(true),
  wait: z.boolean().optional().default(true),
  timeout: z.string().optional().default('5m'),
  reuseValues: z.boolean().optional().default(false),
  chart: z.string().optional().default('oci://ghcr.io/raibid-labs/charts/obi'),
});

export type HelmUpgradeArgs = z.infer<typeof HelmUpgradeArgsSchema>;

/**
 * Helm Upgrade Tool Definition
 */
export const helmUpgradeTool: Tool = {
  name: 'obi_k8s_helm_upgrade',
  description: `Upgrade OBI Helm release to a new version or with new values.

This tool upgrades an existing OBI Helm deployment, allowing you to change
configuration values, update to a new version, or modify resource allocations.

Examples:
- Upgrade to new version: { version: "0.2.0", namespace: "observability" }
- Change endpoint: { values: { obi: { otlpEndpoint: "http://new-collector:4317" } } }
- Update resources: { values: { resources: { limits: { memory: "1Gi" } } } }
- Reuse existing values: { reuseValues: true, version: "0.2.0" }
- Install if missing: { install: true, namespace: "observability" }`,
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
        description: 'Custom values to override',
      },
      version: {
        type: 'string',
        description: 'Chart version to upgrade to',
      },
      install: {
        type: 'boolean',
        description: 'Install if release does not exist',
        default: true,
      },
      wait: {
        type: 'boolean',
        description: 'Wait for pods to be ready',
        default: true,
      },
      timeout: {
        type: 'string',
        description: 'Timeout for upgrade (e.g., 5m, 10m)',
        default: '5m',
      },
      reuseValues: {
        type: 'boolean',
        description: 'Reuse existing values from release',
        default: false,
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
 * Handle helm upgrade execution
 */
export async function handleHelmUpgrade(args: unknown): Promise<{
  content: Array<{ type: string; text: string }>;
}> {
  try {
    const validatedArgs = HelmUpgradeArgsSchema.parse(args);
    logger.info('Upgrading OBI via Helm', {
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
      version: validatedArgs.version,
    });

    // Check if Helm is installed
    const helmCheck = await helmClient.checkHelm();
    if (!helmCheck.installed) {
      throw new Error(
        'Helm is not installed. Please install Helm 3.0+ from https://helm.sh/docs/intro/install/'
      );
    }

    // Get current values before upgrade (for logging)
    try {
      await helmClient.getValues(validatedArgs.release, validatedArgs.namespace);
    } catch (error) {
      logger.debug('Could not get current values (release may not exist)', { error });
    }

    // Perform upgrade
    await helmClient.upgrade({
      chart: validatedArgs.chart,
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
      values: validatedArgs.values,
      version: validatedArgs.version,
      install: validatedArgs.install,
      wait: validatedArgs.wait,
      timeout: validatedArgs.timeout,
      reuseValues: validatedArgs.reuseValues,
    });

    // Get status after upgrade
    const status = await helmClient.status(validatedArgs.release, validatedArgs.namespace);

    // Build change summary
    const changes: string[] = [];
    if (validatedArgs.version) {
      changes.push(`Version: ${validatedArgs.version}`);
    }
    if (validatedArgs.values) {
      changes.push(`Values: ${Object.keys(validatedArgs.values).join(', ')}`);
    }

    const successMessage = `Helm release '${validatedArgs.release}' upgraded successfully!

Release Information:
- Name: ${status.name}
- Namespace: ${status.namespace}
- Status: ${status.info.status}
- Revision: ${status.version}
- Last Deployed: ${status.info.last_deployed}

${changes.length > 0 ? `Changes Applied:\n${changes.map((c) => `- ${c}`).join('\n')}` : ''}

Current Configuration:
- OTLP Endpoint: ${status.config?.obi?.otlpEndpoint || 'http://otel-collector:4317'}
- Instrumented Port: ${status.config?.obi?.openPort || '8080'}
- Network Enabled: ${status.config?.obi?.networkEnabled || 'true'}
- Image: ${status.config?.image?.repository || 'otel/ebpf-instrument'}:${status.config?.image?.tag || 'main'}

Verification Commands:
kubectl get daemonset -n ${validatedArgs.namespace} ${validatedArgs.release}-obi
kubectl get pods -n ${validatedArgs.namespace} -l app.kubernetes.io/name=obi
kubectl logs -n ${validatedArgs.namespace} -l app.kubernetes.io/name=obi --tail=50

Rollback Command (if needed):
helm rollback ${validatedArgs.release} -n ${validatedArgs.namespace}`;

    logger.info('Helm upgrade completed successfully', {
      release: validatedArgs.release,
      namespace: validatedArgs.namespace,
      revision: status.version,
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
    logger.error('Helm upgrade failed', { error: error.message });

    const errorMessage = `Failed to upgrade OBI via Helm: ${error.message}

Common issues:
1. Release not found - Use install: true to create if missing
2. Invalid values - Check value syntax and types
3. Version not available - Verify chart version exists
4. Insufficient resources - Check cluster capacity
5. Rollout timeout - Increase timeout or check pod status

Troubleshooting:
- Check release status: helm status ${(args as any)?.release || 'obi'} -n ${(args as any)?.namespace || 'default'}
- List releases: helm list -n ${(args as any)?.namespace || 'default'}
- Check pods: kubectl get pods -n ${(args as any)?.namespace || 'default'} -l app.kubernetes.io/name=obi
- View events: kubectl get events -n ${(args as any)?.namespace || 'default'} --sort-by='.lastTimestamp'

Rollback Command:
helm rollback ${(args as any)?.release || 'obi'} -n ${(args as any)?.namespace || 'default'}

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
