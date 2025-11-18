import YAML from 'yaml';
import logger from '../../../utils/logger.js';
import { createKubectlClient } from '../k8s-client.js';

export const K8S_RESOURCE_URIS = {
  CONFIG_CURRENT: 'obi-k8s://config/current',
  STATUS_CLUSTER: 'obi-k8s://status/cluster',
  LOGS_RECENT: 'obi-k8s://logs/recent',
} as const;

export function listK8sResources() {
  return {
    resources: [
      {
        uri: K8S_RESOURCE_URIS.CONFIG_CURRENT,
        name: 'Current OBI Kubernetes Configuration',
        description: 'The current OBI ConfigMap from Kubernetes',
        mimeType: 'application/x-yaml',
      },
      {
        uri: K8S_RESOURCE_URIS.STATUS_CLUSTER,
        name: 'OBI Kubernetes Cluster Status',
        description: 'Cluster-wide status of OBI deployment',
        mimeType: 'application/json',
      },
      {
        uri: K8S_RESOURCE_URIS.LOGS_RECENT,
        name: 'Recent OBI Logs',
        description: 'Aggregated recent logs from all OBI pods',
        mimeType: 'text/plain',
      },
    ],
  };
}

export async function readK8sResource(uri: string, namespace = 'observability') {
  logger.debug(`Reading Kubernetes resource: ${uri}`);

  const kubectl = createKubectlClient({ namespace });

  try {
    switch (uri) {
      case K8S_RESOURCE_URIS.CONFIG_CURRENT:
        const configMap = await kubectl.getConfigMap('obi-config', { namespace });
        return {
          contents: [{
            uri,
            mimeType: 'application/x-yaml',
            text: YAML.stringify(configMap.data || {}),
          }],
        };

      case K8S_RESOURCE_URIS.STATUS_CLUSTER:
        const pods = await kubectl.getPods('app=obi', { namespace });
        const nodes = await kubectl.getNodes();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ pods, nodes, timestamp: new Date().toISOString() }, null, 2),
          }],
        };

      case K8S_RESOURCE_URIS.LOGS_RECENT:
        const logPods = await kubectl.getPods('app=obi', { namespace });
        const logs = await Promise.all(
          logPods.map(async p => {
            try {
              const log = await kubectl.logs(p.name, { namespace, tail: 50 });
              return `=== ${p.name} ===\n${log}`;
            } catch {
              return `=== ${p.name} ===\nError fetching logs`;
            }
          })
        );
        return {
          contents: [{
            uri,
            mimeType: 'text/plain',
            text: logs.join('\n\n'),
          }],
        };

      default:
        throw new Error(`Unknown resource URI: ${uri}`);
    }
  } catch (error) {
    logger.error(`Failed to read resource ${uri}:`, error);
    throw error;
  }
}
