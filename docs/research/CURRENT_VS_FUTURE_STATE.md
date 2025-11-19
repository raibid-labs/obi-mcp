# Current vs Future State: OBI Deployment with MCP

**Date**: 2025-11-18
**Status**: Documentation

## Current State (This Reference Implementation)

### How OBI is Deployed

OBI is deployed **natively in Kubernetes** as a DaemonSet using standard kubectl commands:

```bash
# Deploy OBI to k3d cluster
kubectl apply -f examples/k3d-obi-daemonset.yaml
```

This creates:
- Namespace: `observability`
- ServiceAccount + RBAC for Kubernetes metadata access
- ConfigMap with OBI configuration
- DaemonSet running OBI on each node
- PodDisruptionBudget for high availability

### How it's Managed

Currently managed using **standard Kubernetes tools**:

```bash
# Check status
kubectl get pods -n observability -l app=obi

# View logs
kubectl logs -n observability -l app=obi --tail=100

# Update configuration
kubectl edit configmap obi-config -n observability
kubectl rollout restart daemonset/obi -n observability

# Remove OBI
kubectl delete -f examples/k3d-obi-daemonset.yaml
```

### Limitations

1. **No AI assistance**: All operations require kubectl knowledge
2. **Manual configuration**: Users must edit YAML files
3. **No intelligent defaults**: Users must understand OBI config format
4. **No unified experience**: Different tools for different tasks
5. **No configuration validation**: Easy to make mistakes in YAML

## Future State (With Enhanced obi-mcp)

### How OBI Will be Deployed

OBI will be deployed using **AI-assisted natural language** through obi-mcp:

```
User: "Deploy OBI to my k3d cluster with Kubernetes metadata enabled"

Claude (via obi-mcp kubernetes toolset):
✓ Checking cluster connectivity...
✓ Creating namespace 'observability'...
✓ Creating ServiceAccount and RBAC...
✓ Generating OBI configuration with K8s metadata
✓ Creating ConfigMap 'obi-config'...
✓ Deploying DaemonSet 'obi'...
✓ Waiting for pods to be ready... (3/3 pods running)

OBI deployed successfully!
- Namespace: observability
- Pods: 3 running on 3 nodes
- Version: main
- OTLP Endpoint: http://otel-collector:4317
```

### How it Will be Managed

**Natural language interactions** replace kubectl commands:

```
User: "What's the status of OBI in my cluster?"
Claude:
=== OBI Status ===
Running: 3/3 pods
Nodes: k3d-obi-demo-server-0, k3d-obi-demo-agent-0, k3d-obi-demo-agent-1
CPU Usage: 2.3% (avg across pods)
Memory Usage: 245MB (avg across pods)
Uptime: 2h 15m
```

```
User: "Show me OBI logs from the demo-app namespace"
Claude: [Aggregates logs from all 3 OBI pods, filters by namespace]
```

```
User: "Update OBI to increase sampling to 50%"
Claude:
✓ Updating ConfigMap with new sampling rate...
✓ Rolling restart of DaemonSet...
✓ 3/3 pods updated successfully

Configuration updated! Sampling is now 50%.
```

```
User: "Remove OBI from my cluster"
Claude:
✓ Deleting DaemonSet...
✓ Deleting ConfigMap...
✓ Deleting ServiceAccount and RBAC...

OBI removed successfully. ConfigMap backed up to ~/.obi/backups/
```

### Advantages

1. **AI-Assisted**: Natural language instead of kubectl commands
2. **Intelligent Defaults**: OBI MCP knows best practices
3. **Unified Experience**: Same interface for local and K8s deployments
4. **Configuration Validation**: Prevents invalid configs
5. **Multi-Cluster**: Switch between clusters seamlessly
6. **Learning**: No need to memorize kubectl syntax

## Architecture Evolution

### Current: Manual Kubernetes Management

```
User → kubectl → Kubernetes API → OBI DaemonSet
```

Users must:
- Know kubectl syntax
- Understand Kubernetes concepts
- Manually edit YAML files
- Remember resource names and namespaces

### Future: AI-Assisted with obi-mcp

```
User → Claude → obi-mcp (kubernetes toolset) → Kubernetes API → OBI DaemonSet
```

obi-mcp handles:
- Manifest generation
- Configuration validation
- Resource lifecycle management
- Log aggregation
- Status monitoring
- Best practice enforcement

## Migration Path

### Phase 1: Current Reference Implementation ✅

**What we have now**:
- Correct OBI DaemonSet manifests
- k3d cluster setup
- OpenTelemetry Collector deployment
- Sample application
- Documentation showing manual kubectl commands

**Purpose**:
- Show the **correct** way to deploy OBI in Kubernetes
- Provide working examples for users to learn from
- Establish baseline for what obi-mcp will automate

### Phase 2: obi-mcp Enhancement (Separate Work)

**What needs to be built** (see GITHUB_ISSUES.md):

1. **Toolset Architecture** (Issue #1)
   - Refactor obi-mcp to support multiple deployment targets
   - Create pluggable toolset system
   - Maintain backward compatibility

2. **Kubernetes Toolset** (Issue #2)
   - Implement `obi_k8s_deploy` tool
   - Implement `obi_k8s_status` tool
   - Implement `obi_k8s_config` tool
   - Implement `obi_k8s_logs` tool
   - Implement `obi_k8s_undeploy` tool
   - Add Kubernetes resources and prompts

3. **Testing & Documentation** (Issue #6)
   - Integration tests with kind/k3d
   - Usage examples
   - Migration guides

### Phase 3: Updated Reference Implementation

**Once obi-mcp supports Kubernetes**:
- Update this repository to show AI-assisted deployment
- Keep manual kubectl examples as reference
- Demonstrate both approaches
- Show migration from manual to AI-assisted

## Comparison Matrix

| Feature | Current (kubectl) | Future (obi-mcp) |
|---------|-------------------|------------------|
| **Deployment** | Manual YAML editing | Natural language |
| **Configuration** | Edit ConfigMap YAML | "Update sampling to 50%" |
| **Status** | `kubectl get pods` | "What's OBI status?" |
| **Logs** | `kubectl logs -l app=obi` | "Show OBI logs from demo-app namespace" |
| **Multi-cluster** | Switch context manually | "Deploy to production cluster" |
| **Validation** | Apply and hope | Pre-flight validation |
| **Learning Curve** | Must learn kubectl + K8s | Natural conversation |
| **Best Practices** | User must know | Built into toolset |
| **Rollback** | Manual process | "Revert to previous config" |
| **Documentation** | External docs | Integrated help |

## Example Workflows

### Current Workflow: Deploy OBI

```bash
# 1. Create namespace
kubectl create namespace observability

# 2. Apply RBAC manifests
kubectl apply -f rbac.yaml

# 3. Create ConfigMap
kubectl create configmap obi-config --from-file=obi-config.yml -n observability

# 4. Apply DaemonSet
kubectl apply -f daemonset.yaml

# 5. Wait for pods
kubectl wait --for=condition=ready pod -l app=obi -n observability --timeout=60s

# 6. Check status
kubectl get pods -n observability

# 7. Verify logs
kubectl logs -n observability -l app=obi --tail=50
```

7 separate commands, requires understanding of kubectl, YAML, and Kubernetes concepts.

### Future Workflow: Deploy OBI (with obi-mcp)

```
User: "Deploy OBI to my k3d cluster with default settings"
```

1 natural language command. obi-mcp handles all the complexity.

### Current Workflow: Update Configuration

```bash
# 1. Edit ConfigMap
kubectl edit configmap obi-config -n observability

# 2. Manually update YAML in editor

# 3. Save and exit

# 4. Restart DaemonSet
kubectl rollout restart daemonset/obi -n observability

# 5. Monitor rollout
kubectl rollout status daemonset/obi -n observability

# 6. Verify new config active
kubectl logs -n observability -l app=obi --tail=20 | grep sampling
```

6 steps, requires vi/nano skills, YAML knowledge, kubectl expertise.

### Future Workflow: Update Configuration (with obi-mcp)

```
User: "Update OBI sampling rate to 25% and restart"
```

1 command. obi-mcp updates ConfigMap, validates, and performs rolling restart.

## Why Two Phases?

**Phase 1 (Current)**: Establish correct baseline
- Shows **how** OBI should be deployed
- Provides working reference implementation
- Educates users on OBI architecture
- Can be used immediately

**Phase 2 (Future)**: Add AI layer
- Automates the proven approach from Phase 1
- Adds intelligence and assistance
- Improves user experience
- Requires significant obi-mcp development

## How to Use This Reference Today

1. **Learning**: Understand how OBI works in Kubernetes
2. **Manual deployment**: Use the manifests to deploy OBI
3. **Customization**: Modify manifests for your environment
4. **Foundation**: Prepare for future AI-assisted management

## How to Transition to obi-mcp (Future)

Once obi-mcp supports Kubernetes:

1. **Install enhanced obi-mcp**:
   ```bash
   npm install -g obi-mcp-server@2.0.0
   ```

2. **Configure for Kubernetes**:
   ```yaml
   # ~/.config/obi-mcp/config.yml
   toolsets:
     kubernetes:
       enabled: true
       kubeconfig: ~/.kube/config
   ```

3. **Start using AI commands**:
   ```
   "Deploy OBI to my cluster"
   "Show me OBI status"
   "Update configuration..."
   ```

4. **Gradually retire kubectl commands**
   - Keep using kubectl for learning
   - Switch to obi-mcp for daily operations
   - Use both as needed

## Benefits of This Approach

1. **Immediate Value**: Working reference implementation now
2. **Educational**: Learn correct OBI deployment patterns
3. **Future-Proof**: Designed for AI-assisted management
4. **Flexible**: Works with or without obi-mcp
5. **Transparent**: Understand what happens under the hood

## Next Steps

1. **Use this reference** to deploy OBI to k3d ✅
2. **Follow development** of obi-mcp Kubernetes support (see GITHUB_ISSUES.md) 🚧
3. **Try obi-mcp** when Kubernetes toolset is released 🔮
4. **Provide feedback** to improve both manual and AI-assisted approaches 💬

## Related Documentation

- [KUBERNETES_MCP_RESEARCH.md](./KUBERNETES_MCP_RESEARCH.md) - Research findings
- [OBI_MCP_K8S_ARCHITECTURE.md](./OBI_MCP_K8S_ARCHITECTURE.md) - Proposed architecture
- [GITHUB_ISSUES.md](./GITHUB_ISSUES.md) - Implementation issues for obi-mcp
- [K3D_SETUP_GUIDE.md](../K3D_SETUP_GUIDE.md) - Complete setup guide
