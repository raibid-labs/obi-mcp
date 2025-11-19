# GitHub Issues for obi-mcp Kubernetes Support

**Repository**: https://github.com/raibid-labs/obi-mcp
**Created**: 2025-11-18

These issues describe the proposed enhancements to add Kubernetes deployment support to obi-mcp.

---

## Issue 1: [Feature] Refactor to Toolset-Based Architecture

### Labels
`enhancement`, `architecture`, `breaking-change`

### Title
Refactor obi-mcp to toolset-based architecture for multi-platform support

### Description

**Problem Statement**

obi-mcp currently only supports local standalone deployments of OBI. To support Kubernetes, Docker, and future cloud platforms, we need a more flexible architecture that allows multiple deployment targets while maintaining a clean separation of concerns.

**Proposed Solution**

Refactor obi-mcp into a toolset-based architecture similar to [containers/kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server), where each deployment target (local, Kubernetes, Docker, etc.) is implemented as an independent, composable toolset.

**Architecture Overview**

```
obi-mcp/
├── src/
│   ├── core/                 # Shared functionality
│   │   ├── config/           # OBI config schema & validation
│   │   ├── types/            # Shared types
│   │   └── utils/            # Utilities
│   │
│   ├── toolsets/             # Modular deployment targets
│   │   ├── base/             # Base toolset interface
│   │   ├── local/            # Local deployment (existing)
│   │   └── kubernetes/       # Kubernetes deployment (new)
│   │
│   └── server/
│       └── index.ts          # Dynamic toolset registration
```

**Benefits**

1. **Extensibility**: Easy to add new deployment targets (Docker, EKS, GKE, etc.)
2. **Maintainability**: Each toolset is self-contained
3. **Flexibility**: Users can enable only needed toolsets
4. **Testability**: Easier to test individual toolsets
5. **Backward Compatibility**: Existing local deployments continue working

**Implementation Plan**

**Phase 1**: Refactor existing code
- [ ] Create `src/core/` with shared functionality
- [ ] Create `src/toolsets/base/` with base interfaces
- [ ] Extract current implementation into `src/toolsets/local/`
- [ ] Update `src/server/index.ts` for dynamic tool registration
- [ ] Maintain backward compatibility (existing tool names work)
- [ ] Update all tests

**Phase 2**: Configuration system
- [ ] Design unified configuration schema
- [ ] Support per-toolset configuration
- [ ] Environment variable overrides
- [ ] Configuration migration for existing users

**Phase 3**: Documentation
- [ ] Architecture documentation
- [ ] Migration guide
- [ ] Toolset development guide

**Acceptance Criteria**

- [ ] All existing functionality works without changes
- [ ] Tests pass with >95% coverage
- [ ] Clear toolset interface documented
- [ ] Configuration supports multiple toolsets
- [ ] Migration path documented for users

**Related Issues**

- #2 (Add Kubernetes toolset)
- #3 (Add Docker toolset)

**References**

- [Architecture Proposal](../docs/OBI_MCP_K8S_ARCHITECTURE.md)
- [containers/kubernetes-mcp-server toolsets](https://github.com/containers/kubernetes-mcp-server)

---

## Issue 2: [Feature] Add Kubernetes Toolset for OBI Deployment

### Labels
`enhancement`, `kubernetes`, `toolset`

### Title
Add Kubernetes toolset to deploy and manage OBI in Kubernetes clusters

### Description

**Problem Statement**

OBI is designed to run in Kubernetes as a DaemonSet or sidecar container, but obi-mcp only supports local standalone deployments. Users need AI-assisted management of OBI deployments in Kubernetes clusters.

**Proposed Solution**

Implement a Kubernetes toolset that enables deploying, managing, and monitoring OBI in Kubernetes clusters through natural language interactions with Claude.

**Scope**

### Tools

1. **`obi_k8s_deploy`** - Deploy OBI to Kubernetes
   - Modes: DaemonSet, Sidecar
   - Creates: RBAC, ServiceAccount, ConfigMap, DaemonSet
   - Options: Namespace, image version, resources, security context
   - Returns: Deployment status and pod information

2. **`obi_k8s_status`** - Get OBI deployment status
   - Lists all OBI pods with status
   - Shows resource usage (CPU, memory) per pod
   - Aggregates cluster-wide metrics
   - Returns: Pod count, health, resource consumption

3. **`obi_k8s_config`** - Manage OBI configuration
   - Create/update ConfigMap with OBI config
   - Validate configuration before applying
   - Trigger rolling restart if needed
   - Returns: Updated configuration

4. **`obi_k8s_logs`** - Aggregate OBI logs
   - Fetch logs from all OBI pods
   - Support filtering by level, time, namespace
   - Aggregate and sort by timestamp
   - Returns: Merged log stream

5. **`obi_k8s_undeploy`** - Remove OBI from cluster
   - Delete DaemonSet, ConfigMap, RBAC resources
   - Optional: Keep ConfigMap for redeployment
   - Graceful shutdown with configurable timeout
   - Returns: Cleanup status

6. **`obi_k8s_upgrade`** - Update OBI version
   - Update DaemonSet image version
   - Perform rolling update
   - Monitor rollout status
   - Rollback on failure
   - Returns: Upgrade status

### Resources

1. **`obi-k8s://config/current`** - Current OBI ConfigMap
2. **`obi-k8s://status/cluster`** - Cluster-wide OBI status
3. **`obi-k8s://logs/recent`** - Recent aggregated logs

### Prompts

1. **`setup-obi-kubernetes`** - Guided Kubernetes deployment
   - Checks prerequisites (RBAC, metrics-server)
   - Recommends configuration
   - Creates RBAC if needed
   - Deploys OBI with best practices

**Technical Implementation**

### Kubernetes Client

Choose one approach:

**Option A: kubectl wrapper** (faster implementation)
```typescript
class KubectlClient {
  async apply(manifest: any): Promise<void> {
    const yaml = YAML.stringify(manifest);
    await exec(`kubectl apply -f -`, { input: yaml });
  }
}
```

**Option B: client-go (native, better performance)**
```typescript
import * as k8s from '@kubernetes/client-node';

class K8sNativeClient {
  private k8sApi: k8s.CoreV1Api;
  private k8sAppsApi: k8s.AppsV1Api;

  async apply(manifest: any): Promise<void> {
    // Direct API calls
  }
}
```

**Recommendation**: Start with Option A (kubectl wrapper) for MVP, migrate to Option B (native client) in later versions.

### Manifest Generation

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
        'app': 'obi',
        'app.kubernetes.io/managed-by': 'obi-mcp'
      }
    },
    spec: {
      selector: { matchLabels: { app: 'obi' } },
      template: {
        metadata: { labels: { app: 'obi' } },
        spec: {
          hostPID: true,
          serviceAccountName: 'obi',
          containers: [{
            name: 'obi',
            image: `otel/ebpf-instrument:${options.version}`,
            securityContext: {
              privileged: true  // or granular capabilities
            },
            env: [
              { name: 'OTEL_EXPORTER_OTLP_ENDPOINT', value: config.export.otlp.endpoint },
              { name: 'OTEL_EBPF_KUBE_METADATA_ENABLE', value: 'true' },
              { name: 'OTEL_EBPF_CONFIG_PATH', value: '/config/obi-config.yml' }
            ],
            volumeMounts: [
              { name: 'config', mountPath: '/config' }
            ]
          }],
          volumes: [
            { name: 'config', configMap: { name: 'obi-config' } }
          ]
        }
      }
    }
  };
}
```

### Security Model

**RBAC Manifests**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: obi
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: obi
rules:
  - apiGroups: ['']
    resources: ['pods', 'services', 'nodes']
    verbs: ['list', 'watch']
  - apiGroups: ['apps']
    resources: ['replicasets']
    verbs: ['list', 'watch']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: obi
subjects:
  - kind: ServiceAccount
    name: obi
    namespace: observability
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: obi
```

**Security Context Options**

1. **Privileged mode** (default, easier):
   ```yaml
   securityContext:
     privileged: true
   ```

2. **Capabilities mode** (advanced, more secure):
   ```yaml
   securityContext:
     runAsUser: 0
     capabilities:
       add:
         - BPF
         - SYS_PTRACE
         - NET_RAW
         - CHECKPOINT_RESTORE
         - DAC_READ_SEARCH
         - PERFMON
       drop:
         - ALL
   ```

**Implementation Phases**

**Phase 1: Core Deployment** (Week 1-2)
- [ ] Kubernetes client wrapper
- [ ] Manifest generators (DaemonSet, ConfigMap, RBAC)
- [ ] `obi_k8s_deploy` tool (DaemonSet mode only)
- [ ] `obi_k8s_status` tool (basic)
- [ ] Basic integration tests with kind

**Phase 2: Management Tools** (Week 3)
- [ ] `obi_k8s_config` tool
- [ ] `obi_k8s_logs` tool with aggregation
- [ ] `obi_k8s_undeploy` tool
- [ ] Resources implementation

**Phase 3: Advanced Features** (Week 4)
- [ ] `obi_k8s_upgrade` tool
- [ ] Sidecar deployment mode
- [ ] Multi-cluster support
- [ ] `setup-obi-kubernetes` prompt

**Phase 4: Polish** (Week 5)
- [ ] Comprehensive tests
- [ ] Documentation
- [ ] Examples (kind, k3d, minikube)

**Dependencies**

- Requires #1 (toolset architecture) to be completed first
- May benefit from #4 (Helm chart) for complex deployments

**Configuration Example**

```yaml
# ~/.config/obi-mcp/config.yml
toolsets:
  kubernetes:
    enabled: true
    kubeconfig: ~/.kube/config
    default_namespace: observability
    default_image: otel/ebpf-instrument:main
    default_resources:
      requests:
        memory: 256Mi
        cpu: 100m
      limits:
        memory: 512Mi
        cpu: 500m

obi:
  network:
    enable: true
    allowed_attributes:
      - k8s.namespace.name
      - k8s.pod.name
      - http.method
      - http.status_code
  export:
    otlp:
      endpoint: http://otel-collector:4317
      protocol: grpc
  kubernetes:
    metadata_enable: true
```

**Usage Examples**

```typescript
// Deploy OBI as DaemonSet
"Deploy OBI to my k3d cluster in the observability namespace"
→ obi_k8s_deploy({
    mode: 'daemonset',
    namespace: 'observability',
    context: 'k3d-mycluster'
  })

// Check status
"What's the status of OBI in my cluster?"
→ obi_k8s_status({ namespace: 'observability' })

// View logs
"Show me OBI logs from the last 10 minutes"
→ obi_k8s_logs({ since: '10m' })

// Update configuration
"Update OBI to export to a different endpoint"
→ obi_k8s_config({
    config: {
      export: {
        otlp: { endpoint: 'http://new-collector:4317' }
      }
    },
    restart: true
  })
```

**Testing Strategy**

1. **Unit tests**: Manifest generation, config validation
2. **Integration tests**: Deploy to kind cluster, verify pods running
3. **E2E tests**: Full lifecycle (deploy → configure → logs → undeploy)

**Documentation Needed**

- [ ] Kubernetes deployment guide
- [ ] RBAC requirements
- [ ] Security best practices
- [ ] Multi-cluster setup
- [ ] Troubleshooting guide

**Acceptance Criteria**

- [ ] Can deploy OBI as DaemonSet to any K8s cluster
- [ ] Can manage configuration via ConfigMaps
- [ ] Can aggregate logs from all OBI pods
- [ ] Can monitor status and resource usage
- [ ] Can undeploy cleanly
- [ ] Tests pass with >90% coverage
- [ ] Documentation complete

**References**

- [OBI Kubernetes Deployment Docs](https://opentelemetry.io/docs/zero-code/obi/setup/kubernetes/)
- [Architecture Proposal](../docs/OBI_MCP_K8S_ARCHITECTURE.md)
- [Kubernetes MCP Research](../docs/KUBERNETES_MCP_RESEARCH.md)

---

## Issue 3: [Feature] Add Docker Toolset for OBI Deployment

### Labels
`enhancement`, `docker`, `toolset`, `future`

### Title
Add Docker toolset to deploy and manage OBI in Docker environments

### Description

**Problem Statement**

While Kubernetes support is critical, many users run applications in standalone Docker or Docker Compose environments. We should provide first-class support for deploying OBI via Docker.

**Proposed Solution**

Implement a Docker toolset that enables deploying and managing OBI as Docker containers.

**Scope**

### Tools

1. **`obi_docker_deploy`** - Deploy OBI as Docker container
2. **`obi_docker_status`** - Get container status
3. **`obi_docker_logs`** - Fetch container logs
4. **`obi_docker_stop`** - Stop OBI container
5. **`obi_docker_compose`** - Generate docker-compose.yml

**Implementation Details**

```typescript
// Using dockerode library
import Docker from 'dockerode';

class DockerOBIManager {
  private docker: Docker;

  async deploy(config: OBIConfig, options: DockerDeployOptions) {
    const container = await this.docker.createContainer({
      Image: 'otel/ebpf-instrument:main',
      name: 'obi',
      HostConfig: {
        PidMode: 'host',
        Privileged: true,
        NetworkMode: options.network || 'host'
      },
      Env: [
        `OTEL_EXPORTER_OTLP_ENDPOINT=${config.export.otlp.endpoint}`,
        `OTEL_EBPF_OPEN_PORT=${options.targetPort}`
      ]
    });

    await container.start();
    return container.id;
  }
}
```

**Dependencies**

- Requires #1 (toolset architecture)
- Can be developed in parallel with #2 (Kubernetes toolset)

**Priority**

Medium - Useful but not as critical as Kubernetes support.

---

## Issue 4: [Enhancement] Add Helm Chart Support for OBI

### Labels
`enhancement`, `kubernetes`, `helm`

### Title
Support Helm chart generation and deployment for OBI

### Description

**Problem Statement**

While direct Kubernetes manifest deployment works, many organizations use Helm for managing applications. We should provide Helm chart support for more complex deployments and better GitOps integration.

**Proposed Solution**

Add Helm chart generation and deployment capabilities to the Kubernetes toolset.

**Scope**

1. **Helm chart template** in obi-mcp repository
2. **`obi_k8s_helm_install`** tool - Install via Helm
3. **`obi_k8s_helm_upgrade`** tool - Upgrade release
4. **Chart customization** - Support values.yaml overrides

**Benefits**

- Easier version management
- Better GitOps integration (ArgoCD, Flux)
- Templating for multi-environment deployments
- Rollback capabilities

**Chart Structure**

```
charts/obi/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── daemonset.yaml
│   ├── configmap.yaml
│   ├── serviceaccount.yaml
│   ├── clusterrole.yaml
│   ├── clusterrolebinding.yaml
│   └── NOTES.txt
└── README.md
```

**Dependencies**

- Requires #2 (Kubernetes toolset)
- Builds on existing manifest generation

**Priority**

Low - Nice to have, but direct K8s deployment is sufficient for MVP.

---

## Issue 5: [Research] Investigate Integration with Existing Kubernetes MCP Servers

### Labels
`research`, `kubernetes`, `integration`

### Title
Research integration opportunities with existing Kubernetes MCP servers

### Description

**Problem Statement**

Several Kubernetes MCP servers already exist (containers/kubernetes-mcp-server, alexei-led/k8s-mcp-server, etc.). We should understand if/how obi-mcp should integrate with or complement these existing tools.

**Research Questions**

1. **Can users run multiple MCP servers simultaneously?**
   - How does tool naming collision work?
   - Can Claude coordinate between multiple servers?

2. **Should obi-mcp integrate with k8s-mcp-server?**
   - Option A: Standalone (obi-mcp handles all K8s operations)
   - Option B: Delegate (obi-mcp uses k8s-mcp for generic operations)
   - Option C: Complementary (users run both, each for specific purposes)

3. **What's the best user experience?**
   - Single server that does everything?
   - Specialized servers that work together?
   - Plugin architecture?

**Deliverables**

- [ ] Document MCP server composition patterns
- [ ] Prototype multi-server Claude Desktop config
- [ ] Recommend integration strategy
- [ ] Update architecture proposal based on findings

**Dependencies**

- Can be done in parallel with other work
- Findings may influence #2 implementation approach

**Priority**

Medium - Important for getting the architecture right, but not blocking.

---

## Issue 6: [Documentation] Create Kubernetes Deployment Examples

### Labels
`documentation`, `examples`, `kubernetes`

### Title
Create comprehensive examples for OBI deployment in various Kubernetes environments

### Description

**Problem Statement**

Users need concrete examples of deploying OBI to different Kubernetes distributions and environments.

**Proposed Examples**

1. **k3d**: Lightweight local development
2. **kind**: Kubernetes in Docker
3. **minikube**: Local testing
4. **EKS**: AWS managed Kubernetes
5. **GKE**: Google Cloud Kubernetes
6. **AKS**: Azure Kubernetes Service
7. **OpenShift**: Red Hat platform

**Each Example Should Include**

- Cluster setup instructions
- OBI deployment via obi-mcp
- OTLP collector deployment
- Sample application
- Verification steps
- Troubleshooting tips

**Repository Structure**

```
examples/
├── k3d/
│   ├── README.md
│   ├── cluster-config.yaml
│   ├── obi-config.yml
│   └── sample-app.yaml
├── kind/
├── minikube/
├── eks/
├── gke/
└── aks/
```

**Dependencies**

- Requires #2 (Kubernetes toolset) to be completed

**Priority**

High - Good documentation is critical for adoption.

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Issue #1: Toolset architecture refactor
- [ ] Issue #5: Research integration patterns

### Phase 2: Kubernetes Support (Weeks 3-5)
- [ ] Issue #2: Kubernetes toolset implementation

### Phase 3: Documentation & Examples (Week 6)
- [ ] Issue #6: Create deployment examples
- [ ] Update main README
- [ ] Migration guide

### Phase 4: Advanced Features (Weeks 7-8)
- [ ] Issue #4: Helm chart support
- [ ] Issue #3: Docker toolset (if prioritized)

### Phase 5: Polish (Week 9)
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Release preparation

---

## Notes for Issue Creation

When creating these issues on GitHub:

1. Copy each issue section above into a new GitHub issue
2. Add the specified labels
3. Create a milestone for "Kubernetes Support" if needed
4. Link related issues using GitHub's issue references (#N)
5. Consider creating a GitHub Project board to track progress
6. Add any relevant screenshots or diagrams

## Additional Considerations

1. **Breaking Changes**: Issue #1 involves architectural changes. Use semantic versioning:
   - Version 1.0.0: Current stable
   - Version 2.0.0: Toolset architecture (breaking)

2. **Deprecation Strategy**: Provide clear migration path and deprecation warnings

3. **Community Feedback**: Create discussion threads for major architectural decisions

4. **Testing**: Ensure CI/CD pipeline covers all new toolsets
