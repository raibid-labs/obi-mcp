# OBI MCP Kubernetes Architecture Proposal

**Version**: 1.0
**Date**: 2025-11-18
**Status**: Proposal

## Overview

This document proposes an architecture for extending obi-mcp to support Kubernetes deployments of OpenTelemetry eBPF Instrumentation (OBI). The design follows a **toolset-based architecture** enabling support for multiple deployment targets while maintaining backward compatibility.

## Current Architecture

### Existing obi-mcp Structure

```
obi-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── server/
│   │   └── index.ts          # Server implementation
│   ├── tools/                # MCP tools (6 tools)
│   │   ├── status.ts         # obi_get_status
│   │   ├── deploy-local.ts   # obi_deploy_local
│   │   ├── get-config.ts     # obi_get_config
│   │   ├── update-config.ts  # obi_update_config
│   │   ├── get-logs.ts       # obi_get_logs
│   │   └── stop.ts           # obi_stop
│   ├── resources/            # MCP resources
│   ├── prompts/              # MCP prompts
│   └── utils/
│       ├── obi-manager.ts    # OBI lifecycle management
│       └── process.ts        # Process management
```

### Current Capabilities

- Deploy OBI as local standalone process
- Manage OBI lifecycle (start/stop)
- Update configuration files
- Query logs and status
- All operations target **local host only**

## Proposed Architecture

### Toolset-Based Design

Refactor obi-mcp into independent, composable toolsets:

```
obi-mcp/
├── src/
│   ├── index.ts
│   ├── server/
│   │   └── index.ts          # Dynamic toolset registration
│   │
│   ├── core/                 # Shared core functionality
│   │   ├── config/
│   │   │   ├── obi-config.ts           # OBI config schema
│   │   │   ├── validator.ts            # Config validation
│   │   │   └── converter.ts            # Format conversion
│   │   ├── types/
│   │   │   ├── obi.ts
│   │   │   ├── deployment.ts           # Deployment abstractions
│   │   │   └── mcp.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── errors.ts
│   │
│   ├── toolsets/             # Modular toolsets
│   │   │
│   │   ├── base/             # Base toolset interface
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── local/            # Local deployment toolset
│   │   │   ├── index.ts      # Toolset registration
│   │   │   ├── tools/
│   │   │   │   ├── deploy.ts
│   │   │   │   ├── status.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── logs.ts
│   │   │   │   └── stop.ts
│   │   │   ├── manager/
│   │   │   │   └── local-manager.ts    # Local OBI management
│   │   │   └── resources/
│   │   │       └── local-resources.ts
│   │   │
│   │   ├── kubernetes/       # Kubernetes toolset (NEW)
│   │   │   ├── index.ts      # Toolset registration
│   │   │   ├── tools/
│   │   │   │   ├── deploy.ts           # Deploy DaemonSet/Sidecar
│   │   │   │   ├── status.ts           # Get pod status
│   │   │   │   ├── config.ts           # Manage ConfigMaps
│   │   │   │   ├── logs.ts             # Aggregate pod logs
│   │   │   │   ├── undeploy.ts         # Remove OBI from cluster
│   │   │   │   └── upgrade.ts          # Update OBI version
│   │   │   ├── manager/
│   │   │   │   └── k8s-manager.ts      # K8s client wrapper
│   │   │   ├── resources/
│   │   │   │   └── k8s-resources.ts    # K8s-specific resources
│   │   │   ├── manifests/
│   │   │   │   ├── daemonset.ts        # DaemonSet template
│   │   │   │   ├── sidecar.ts          # Sidecar template
│   │   │   │   ├── rbac.ts             # RBAC manifests
│   │   │   │   └── configmap.ts        # ConfigMap template
│   │   │   └── client/
│   │   │       ├── kubectl.ts          # kubectl wrapper
│   │   │       └── native.ts           # client-go implementation
│   │   │
│   │   └── docker/           # Docker toolset (FUTURE)
│   │       └── ...
│   │
│   ├── resources/            # Global MCP resources
│   └── prompts/              # Global MCP prompts
```

## Toolset Architecture

### Base Toolset Interface

```typescript
interface OBIToolset {
  name: string;
  version: string;
  enabled: boolean;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Tool registration
  getTools(): Tool[];
  getResources(): Resource[];
  getPrompts(): Prompt[];

  // Health check
  isAvailable(): Promise<boolean>;
}
```

### Toolset Registration

```typescript
// src/server/index.ts
class OBIMCPServer {
  private toolsets: Map<string, OBIToolset> = new Map();

  async registerToolset(toolset: OBIToolset) {
    if (!await toolset.isAvailable()) {
      console.warn(`Toolset ${toolset.name} not available`);
      return;
    }

    await toolset.initialize();
    this.toolsets.set(toolset.name, toolset);

    // Register tools with MCP server
    for (const tool of toolset.getTools()) {
      this.server.tool(tool.name, tool.handler);
    }
  }

  async start() {
    // Register enabled toolsets
    if (config.toolsets.local.enabled) {
      await this.registerToolset(new LocalToolset());
    }
    if (config.toolsets.kubernetes.enabled) {
      await this.registerToolset(new KubernetesToolset());
    }
    // ... other toolsets
  }
}
```

## Kubernetes Toolset Detailed Design

### 1. Deployment Manager

```typescript
// src/toolsets/kubernetes/manager/k8s-manager.ts
class KubernetesOBIManager {
  private client: K8sClient;

  async deployDaemonSet(config: OBIConfig, options: DeployOptions): Promise<Deployment> {
    // 1. Generate RBAC manifests
    const rbac = this.generateRBAC();
    await this.client.apply(rbac);

    // 2. Create ConfigMap from OBI config
    const configMap = this.generateConfigMap(config);
    await this.client.apply(configMap);

    // 3. Generate DaemonSet manifest
    const daemonSet = this.generateDaemonSet(config, options);
    await this.client.apply(daemonSet);

    // 4. Wait for rollout
    await this.client.waitForRollout('daemonset', 'obi');

    return {
      type: 'daemonset',
      namespace: options.namespace,
      status: 'deployed'
    };
  }

  async getStatus(namespace: string): Promise<OBIStatus> {
    const pods = await this.client.getPods({
      namespace,
      labelSelector: 'app=obi'
    });

    return {
      running: pods.filter(p => p.status === 'Running').length,
      total: pods.length,
      pods: pods.map(p => ({
        name: p.name,
        node: p.node,
        status: p.status,
        cpuUsage: p.metrics.cpu,
        memoryUsage: p.metrics.memory
      }))
    };
  }

  async getLogs(namespace: string, options: LogOptions): Promise<string[]> {
    const pods = await this.client.getPods({
      namespace,
      labelSelector: 'app=obi'
    });

    const logs = await Promise.all(
      pods.map(pod => this.client.getLogs(pod.name, namespace, options))
    );

    // Aggregate and sort by timestamp
    return this.aggregateLogs(logs);
  }
}
```

### 2. Manifest Templates

```typescript
// src/toolsets/kubernetes/manifests/daemonset.ts
export function generateDaemonSet(config: OBIConfig, options: DeployOptions) {
  return {
    apiVersion: 'apps/v1',
    kind: 'DaemonSet',
    metadata: {
      name: 'obi',
      namespace: options.namespace,
      labels: {
        app: 'obi',
        'app.kubernetes.io/name': 'obi',
        'app.kubernetes.io/managed-by': 'obi-mcp'
      }
    },
    spec: {
      selector: {
        matchLabels: { app: 'obi' }
      },
      template: {
        metadata: {
          labels: { app: 'obi' }
        },
        spec: {
          hostPID: true,
          serviceAccountName: 'obi',
          containers: [{
            name: 'obi',
            image: `otel/ebpf-instrument:${options.version || 'main'}`,
            securityContext: {
              privileged: options.privileged !== false,
              capabilities: !options.privileged ? {
                add: ['BPF', 'SYS_PTRACE', 'NET_RAW', 'CHECKPOINT_RESTORE',
                      'DAC_READ_SEARCH', 'PERFMON'],
                drop: ['ALL']
              } : undefined
            },
            env: [
              {
                name: 'OTEL_EXPORTER_OTLP_ENDPOINT',
                value: config.export.otlp.endpoint
              },
              {
                name: 'OTEL_EBPF_KUBE_METADATA_ENABLE',
                value: 'true'
              },
              {
                name: 'OTEL_EBPF_CONFIG_PATH',
                value: '/config/obi-config.yml'
              }
            ],
            volumeMounts: [{
              name: 'config',
              mountPath: '/config'
            }],
            resources: options.resources || {
              requests: { memory: '256Mi', cpu: '100m' },
              limits: { memory: '512Mi', cpu: '500m' }
            }
          }],
          volumes: [{
            name: 'config',
            configMap: {
              name: 'obi-config'
            }
          }]
        }
      }
    }
  };
}
```

### 3. MCP Tools

```typescript
// src/toolsets/kubernetes/tools/deploy.ts
export const obi_k8s_deploy: Tool = {
  name: 'obi_k8s_deploy',
  description: 'Deploy OBI to a Kubernetes cluster',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['daemonset', 'sidecar'],
        description: 'Deployment mode'
      },
      namespace: {
        type: 'string',
        description: 'Target namespace',
        default: 'observability'
      },
      context: {
        type: 'string',
        description: 'Kubernetes context (cluster)'
      },
      config: {
        type: 'object',
        description: 'OBI configuration'
      },
      version: {
        type: 'string',
        description: 'OBI image version',
        default: 'main'
      },
      privileged: {
        type: 'boolean',
        description: 'Use privileged mode',
        default: true
      }
    },
    required: ['mode']
  },

  async handler(args) {
    const manager = new KubernetesOBIManager(args.context);

    const deployment = await manager.deployDaemonSet(
      args.config || getDefaultConfig(),
      {
        namespace: args.namespace,
        version: args.version,
        privileged: args.privileged
      }
    );

    return {
      content: [{
        type: 'text',
        text: formatDeploymentResult(deployment)
      }]
    };
  }
};
```

## Configuration Model

### Unified Configuration

```yaml
# config/obi-mcp-config.yml
toolsets:
  local:
    enabled: true
    binary_path: /usr/local/bin/obi

  kubernetes:
    enabled: true
    kubeconfig: ~/.kube/config
    default_namespace: observability
    default_image: otel/ebpf-instrument:main

  docker:
    enabled: false

# OBI configuration (shared across toolsets)
obi:
  network:
    enable: true
    allowed_attributes:
      - http.method
      - http.status_code
  export:
    otlp:
      endpoint: http://localhost:4317
      protocol: grpc
```

### Environment-Specific Overrides

```typescript
// Kubernetes-specific config additions
interface K8sOBIConfig extends OBIConfig {
  kubernetes?: {
    metadata_enable: boolean;
    service_account: string;
    rbac: RBACConfig;
  };
}
```

## Implementation Phases

### Phase 1: Refactor to Toolsets (Week 1-2)

**Goals**:
- Extract local toolset from current implementation
- Create toolset registration system
- Maintain backward compatibility
- Update tests

**Deliverables**:
- `/src/toolsets/base/` - Base interfaces
- `/src/toolsets/local/` - Local toolset
- `/src/server/index.ts` - Toolset registration
- Updated tests

### Phase 2: Kubernetes Toolset Core (Week 3-4)

**Goals**:
- Implement K8s client wrapper
- Create manifest generators
- Add basic deployment tools

**Deliverables**:
- `/src/toolsets/kubernetes/manager/` - K8s manager
- `/src/toolsets/kubernetes/manifests/` - Templates
- `/src/toolsets/kubernetes/tools/deploy.ts` - Deploy tool
- `/src/toolsets/kubernetes/tools/status.ts` - Status tool

### Phase 3: Advanced K8s Features (Week 5-6)

**Goals**:
- Add configuration management
- Implement log aggregation
- Support multi-cluster

**Deliverables**:
- `/src/toolsets/kubernetes/tools/config.ts` - ConfigMap management
- `/src/toolsets/kubernetes/tools/logs.ts` - Log aggregation
- Multi-cluster support
- Helm chart (optional)

### Phase 4: Polish & Documentation (Week 7-8)

**Goals**:
- Comprehensive testing
- Documentation
- Examples and tutorials

**Deliverables**:
- Integration tests
- E2E tests
- Documentation updates
- Example deployments

## Testing Strategy

### Unit Tests

- Manifest generation
- Config conversion
- Tool handlers

### Integration Tests

- K8s client operations (with kind)
- ConfigMap creation
- DaemonSet deployment

### E2E Tests

- Full deployment workflow
- Multi-cluster scenarios
- Upgrade testing

## Migration Path

### Backward Compatibility

Existing users continue working without changes:

```typescript
// Old usage (still works)
obi_deploy_local({ config: {...} })

// New usage (explicit toolset)
obi_local_deploy({ config: {...} })
obi_k8s_deploy({ mode: 'daemonset', namespace: 'default' })
```

### Configuration Migration

```typescript
// Auto-detect and migrate old configs
function migrateConfig(oldConfig: any): OBIMCPConfig {
  return {
    toolsets: {
      local: {
        enabled: true,
        ...oldConfig
      },
      kubernetes: {
        enabled: false
      }
    },
    obi: oldConfig.obi || {}
  };
}
```

## Security Considerations

### Kubernetes RBAC

Minimal required permissions:

```yaml
rules:
  - apiGroups: ['']
    resources: ['pods', 'configmaps', 'serviceaccounts']
    verbs: ['get', 'list', 'create', 'update', 'patch']
  - apiGroups: ['apps']
    resources: ['daemonsets']
    verbs: ['get', 'list', 'create', 'update', 'patch', 'delete']
  - apiGroups: ['rbac.authorization.k8s.io']
    resources: ['roles', 'rolebindings', 'clusterroles', 'clusterrolebindings']
    verbs: ['get', 'list', 'create']
```

### Privileged Containers

Support both privileged and capability-based security:

- Default: Privileged mode (easier setup)
- Advanced: Granular capabilities (better security)
- Document trade-offs clearly

## Future Enhancements

### Additional Toolsets

- **Docker Toolset**: Docker Compose deployments
- **Cloud Toolset**: EKS, GKE, AKS specific features
- **Operator Toolset**: Custom OBI operator

### Advanced Features

- Helm chart generation
- Kustomize overlays
- GitOps integration (ArgoCD, Flux)
- Multi-cluster federation
- Auto-scaling based on metrics

## References

- [Kubernetes client-go](https://github.com/kubernetes/client-go)
- [containers/kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server)
- [OBI Kubernetes Deployment](https://opentelemetry.io/docs/zero-code/obi/setup/kubernetes/)
- [MCP Specification](https://modelcontextprotocol.io/)
