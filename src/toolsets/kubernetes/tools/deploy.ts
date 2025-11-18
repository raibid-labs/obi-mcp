import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../../../utils/logger.js';
import { createKubectlClient, KubectlExecOptions } from '../k8s-client.js';
import { createManifestGenerator, ObiK8sConfig } from '../manifest-generator.js';

export const k8sDeployTool: Tool = {
  name: 'obi_k8s_deploy',
  description: 'Deploy OBI to Kubernetes as DaemonSet with RBAC and ConfigMap',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      image: { type: 'string', default: 'ghcr.io/open-telemetry/opentelemetry-ebpf-instrumentation' },
      imageTag: { type: 'string', default: 'latest' },
      otlpEndpoint: { type: 'string' },
      privileged: { type: 'boolean', default: true },
      resourcesLimitMemory: { type: 'string', default: '512Mi' },
      resourcesLimitCpu: { type: 'string', default: '500m' },
      resourcesRequestMemory: { type: 'string', default: '256Mi' },
      resourcesRequestCpu: { type: 'string', default: '100m' },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
      dryRun: { type: 'boolean', default: false },
    },
  },
};

const K8sDeployArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  image: z.string().optional().default('ghcr.io/open-telemetry/opentelemetry-ebpf-instrumentation'),
  imageTag: z.string().optional().default('latest'),
  otlpEndpoint: z.string().optional(),
  privileged: z.boolean().optional().default(true),
  resourcesLimitMemory: z.string().optional().default('512Mi'),
  resourcesLimitCpu: z.string().optional().default('500m'),
  resourcesRequestMemory: z.string().optional().default('256Mi'),
  resourcesRequestCpu: z.string().optional().default('100m'),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
  dryRun: z.boolean().optional().default(false),
});

export type K8sDeployArgs = z.infer<typeof K8sDeployArgsSchema>;

export async function handleK8sDeploy(args: unknown) {
  try {
    const validatedArgs = K8sDeployArgsSchema.parse(args);
    logger.info('Deploying OBI to Kubernetes', { namespace: validatedArgs.namespace });

    const kubectlOpts: KubectlExecOptions = {
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    };
    const kubectl = createKubectlClient(kubectlOpts);

    const connectivity = await kubectl.checkConnectivity();
    if (!connectivity.connected) {
      throw new Error(`Cannot connect to Kubernetes: \${connectivity.error}`);
    }

    const obiConfig: ObiK8sConfig = {
      namespace: validatedArgs.namespace,
      image: validatedArgs.image,
      imageTag: validatedArgs.imageTag,
      privileged: validatedArgs.privileged,
      hostPID: true,
      hostNetwork: true,
      resources: {
        limits: { memory: validatedArgs.resourcesLimitMemory, cpu: validatedArgs.resourcesLimitCpu },
        requests: { memory: validatedArgs.resourcesRequestMemory, cpu: validatedArgs.resourcesRequestCpu },
      },
      ...(validatedArgs.otlpEndpoint && { otlpEndpoint: validatedArgs.otlpEndpoint }),
    };

    const generator = createManifestGenerator();
    const validation = generator.validateConfig(obiConfig);
    if (!validation.valid) {
      throw new Error(`Invalid config: \${validation.errors.join(', ')}`);
    }

    const manifests = generator.generateAll(obiConfig);

    if (validatedArgs.dryRun) {
      return {
        content: [{
          type: 'text',
          text: `=== OBI Kubernetes Deployment (Dry Run) ===\n\nNamespace: \${obiConfig.namespace}\nImage: \${obiConfig.image}:\${obiConfig.imageTag}\n\n---Manifests---\n\${manifests}`,
        }],
      };
    }

    const namespaceExists = await kubectl.namespaceExists(validatedArgs.namespace);
    if (!namespaceExists) {
      await kubectl.createNamespace(validatedArgs.namespace);
    }

    await kubectl.apply(manifests, { namespace: validatedArgs.namespace });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pods = await kubectl.getPods('app=obi', { namespace: validatedArgs.namespace });
    const nodes = await kubectl.getNodes();

    return {
      content: [{
        type: 'text',
        text: `=== OBI Deployed Successfully ===\n\nNamespace: \${obiConfig.namespace}\nImage: \${obiConfig.image}:\${obiConfig.imageTag}\nPods: \${pods.length}/\${nodes.length}\n\nStatus: \${pods.filter(p => p.status === 'Running').length} running\n\nNext: Use obi_k8s_status() to check health`,
      }],
    };
  } catch (error) {
    logger.error('Deploy error', { error });
    return {
      content: [{ type: 'text', text: `Error: \${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
