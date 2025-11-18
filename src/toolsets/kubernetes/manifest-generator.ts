import YAML from 'yaml';

export interface ObiK8sConfig {
  namespace: string;
  image: string;
  imageTag?: string;
  privileged: boolean;
  hostPID: boolean;
  hostNetwork: boolean;
  resources: {
    limits: { memory: string; cpu: string };
    requests: { memory: string; cpu: string };
  };
  otlpEndpoint?: string;
  additionalEnv?: Record<string, string>;
  nodeSelector?: Record<string, string>;
  tolerations?: Array<{ key: string; operator: string; effect: string }>;
}

export const DEFAULT_OBI_K8S_CONFIG: Partial<ObiK8sConfig> = {
  namespace: 'observability',
  image: 'ghcr.io/open-telemetry/opentelemetry-ebpf-instrumentation',
  imageTag: 'latest',
  privileged: true,
  hostPID: true,
  hostNetwork: true,
  resources: {
    limits: { memory: '512Mi', cpu: '500m' },
    requests: { memory: '256Mi', cpu: '100m' },
  },
};

export class ManifestGenerator {
  generateAll(config: ObiK8sConfig): string {
    const manifests = [
      this.generateNamespace(config.namespace),
      this.generateServiceAccount(config.namespace),
      this.generateClusterRole(),
      this.generateClusterRoleBinding(config.namespace),
      this.generateConfigMap(config),
      this.generateDaemonSet(config),
    ];
    return manifests.join('\n---\n');
  }

  generateNamespace(namespace: string): string {
    return YAML.stringify({
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: namespace, labels: { 'app.kubernetes.io/name': 'obi' } },
    });
  }

  generateServiceAccount(namespace: string): string {
    return YAML.stringify({
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: { name: 'obi', namespace, labels: { 'app.kubernetes.io/name': 'obi' } },
    });
  }

  generateClusterRole(): string {
    return YAML.stringify({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRole',
      metadata: { name: 'obi', labels: { 'app.kubernetes.io/name': 'obi' } },
      rules: [
        { apiGroups: [''], resources: ['nodes', 'pods', 'services'], verbs: ['get', 'list', 'watch'] },
      ],
    });
  }

  generateClusterRoleBinding(namespace: string): string {
    return YAML.stringify({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRoleBinding',
      metadata: { name: 'obi', labels: { 'app.kubernetes.io/name': 'obi' } },
      roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind: 'ClusterRole', name: 'obi' },
      subjects: [{ kind: 'ServiceAccount', name: 'obi', namespace }],
    });
  }

  generateConfigMap(config: ObiK8sConfig): string {
    const data: Record<string, string> = {};
    if (config.otlpEndpoint) data['otlp-endpoint'] = config.otlpEndpoint;
    data['obi-config.yml'] = YAML.stringify({
      network: { enable: true },
      exporter: { otlp: { endpoint: config.otlpEndpoint || 'http://localhost:4317' } },
    });

    return YAML.stringify({
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: { name: 'obi-config', namespace: config.namespace, labels: { 'app.kubernetes.io/name': 'obi' } },
      data,
    });
  }

  generateDaemonSet(config: ObiK8sConfig): string {
    const imageWithTag = config.imageTag ? `\${config.image}:\${config.imageTag}` : config.image;
    const env: Array<any> = [
      { name: 'OBI_NETWORK_METRICS', value: 'true' },
      { name: 'NODE_NAME', valueFrom: { fieldRef: { fieldPath: 'spec.nodeName' } } },
      { name: 'POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } },
    ];

    if (config.otlpEndpoint) {
      env.push({
        name: 'OTEL_EXPORTER_OTLP_ENDPOINT',
        valueFrom: { configMapKeyRef: { name: 'obi-config', key: 'otlp-endpoint' } },
      });
    }

    return YAML.stringify({
      apiVersion: 'apps/v1',
      kind: 'DaemonSet',
      metadata: { name: 'obi', namespace: config.namespace, labels: { app: 'obi' } },
      spec: {
        selector: { matchLabels: { app: 'obi' } },
        updateStrategy: { type: 'RollingUpdate', rollingUpdate: { maxUnavailable: 1 } },
        template: {
          metadata: { labels: { app: 'obi' } },
          spec: {
            serviceAccountName: 'obi',
            hostPID: config.hostPID,
            hostNetwork: config.hostNetwork,
            containers: [
              {
                name: 'obi',
                image: imageWithTag,
                securityContext: {
                  privileged: config.privileged,
                  capabilities: { add: ['SYS_ADMIN', 'SYS_PTRACE', 'SYS_RESOURCE'] },
                },
                env,
                resources: config.resources,
                volumeMounts: [
                  { name: 'config', mountPath: '/etc/obi', readOnly: true },
                  { name: 'sys', mountPath: '/sys', readOnly: true },
                ],
              },
            ],
            volumes: [
              { name: 'config', configMap: { name: 'obi-config' } },
              { name: 'sys', hostPath: { path: '/sys' } },
            ],
          },
        },
      },
    });
  }

  generateImageUpdate(namespace: string, image: string, imageTag: string): string {
    return YAML.stringify({
      apiVersion: 'apps/v1',
      kind: 'DaemonSet',
      metadata: { name: 'obi', namespace },
      spec: { template: { spec: { containers: [{ name: 'obi', image: `\${image}:\${imageTag}` }] } } },
    });
  }

  validateConfig(config: Partial<ObiK8sConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.namespace) errors.push('namespace is required');
    if (!config.image) errors.push('image is required');
    return { valid: errors.length === 0, errors };
  }
}

export function createManifestGenerator(): ManifestGenerator {
  return new ManifestGenerator();
}
