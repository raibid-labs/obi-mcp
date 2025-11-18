import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';
import { createManifestGenerator } from '../manifest-generator.js';

export const k8sUpgradeTool: Tool = {
  name: 'obi_k8s_upgrade',
  description: 'Upgrade OBI version in Kubernetes cluster',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: { type: 'string', default: 'observability' },
      image: { type: 'string' },
      imageTag: { type: 'string' },
      waitForRollout: { type: 'boolean', default: true },
      kubeconfig: { type: 'string' },
      context: { type: 'string' },
    },
  },
};

const K8sUpgradeArgsSchema = z.object({
  namespace: z.string().optional().default('observability'),
  image: z.string().optional(),
  imageTag: z.string().optional(),
  waitForRollout: z.boolean().optional().default(true),
  kubeconfig: z.string().optional(),
  context: z.string().optional(),
});

export type K8sUpgradeArgs = z.infer<typeof K8sUpgradeArgsSchema>;

export async function handleK8sUpgrade(args: unknown) {
  try {
    const validatedArgs = K8sUpgradeArgsSchema.parse(args);

    if (!validatedArgs.image && !validatedArgs.imageTag) {
      throw new Error('Either image or imageTag must be specified');
    }

    const kubectl = createKubectlClient({
      namespace: validatedArgs.namespace,
      kubeconfig: validatedArgs.kubeconfig,
      context: validatedArgs.context,
    });

    const daemonSet = await kubectl.get('daemonset/obi', { namespace: validatedArgs.namespace });
    const currentImage = daemonSet.spec?.template?.spec?.containers?.[0]?.image || 'unknown';
    const [currentImageName, currentTag] = currentImage.split(':');

    const newImageName = validatedArgs.image || currentImageName;
    const newTag = validatedArgs.imageTag || currentTag || 'latest';
    const newImage = `\${newImageName}:\${newTag}`;

    if (newImage === currentImage) {
      return {
        content: [{ type: 'text', text: `No upgrade needed - already using \${newImage}` }],
      };
    }

    const generator = createManifestGenerator();
    const updateManifest = generator.generateImageUpdate(validatedArgs.namespace, newImageName, newTag);

    await kubectl.apply(updateManifest, { namespace: validatedArgs.namespace });

    let status = 'Upgrade initiated';
    if (validatedArgs.waitForRollout) {
      status = await kubectl.getRolloutStatus('daemonset', 'obi', { namespace: validatedArgs.namespace });
    }

    const text = `=== OBI Upgraded ===\n\nPrevious: \${currentImage}\nNew: \${newImage}\n\n\${status}`;

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    logger.error('Upgrade error', { error });
    return {
      content: [{ type: 'text', text: `Error: \${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
