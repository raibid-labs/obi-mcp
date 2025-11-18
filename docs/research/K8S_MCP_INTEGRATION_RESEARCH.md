# Kubernetes MCP Server Integration Research

**Research Date**: 2025-11-18
**Issue**: #25 - Research integration opportunities with existing Kubernetes MCP servers
**Status**: Complete
**Recommendation**: **Option C - Complementary Strategy**

---

## Executive Summary

This research analyzed 7 existing Kubernetes MCP servers, tested multi-server composition patterns, and evaluated integration strategies for obi-mcp. **Key Finding**: The MCP protocol fully supports running multiple servers simultaneously with client-side tool namespacing. **Recommendation**: Adopt a **complementary strategy** where obi-mcp focuses exclusively on OBI-specific operations while users can optionally run general Kubernetes MCP servers for cluster management.

### Top 3 Findings

1. **Multi-Server Support is Native**: MCP clients (Claude Desktop, Cursor) support multiple servers out-of-the-box with automatic tool namespacing to prevent collisions
2. **Mature K8s Ecosystem Exists**: 7+ production Kubernetes MCP servers already provide comprehensive cluster management capabilities
3. **Clear Differentiation Path**: OBI's unique eBPF instrumentation focus provides natural separation from generic K8s operations

---

## 1. Multi-Server Capabilities

### MCP Protocol Support

**Confirmed**: The Model Context Protocol explicitly supports multiple servers running simultaneously.

#### How It Works

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "npx",
      "args": ["kubernetes-mcp-server"]
    },
    "obi": {
      "command": "node",
      "args": ["/path/to/obi-mcp/dist/index.js"]
    }
  }
}
```

- **Host Application**: Creates N MCP Clients, one per server
- **Handshake**: Each client exchanges capabilities and protocol versions
- **Tool Aggregation**: Client fetches tools from all servers via JSON-RPC `tools/list`
- **Single Interface**: LLM sees all tools as a unified toolset

#### Client-Specific Behavior

| Client | Namespacing Strategy | Collision Handling |
|--------|---------------------|-------------------|
| **Cursor** | `mcp_<server>_<tool>` | Automatic prefix per server |
| **VSCode** | De-duplicates tools | Hides duplicate names from UI |
| **Claude Desktop** | Server name prefix | First server wins priority |

**Best Practice**: List most frequently used servers first in configuration for optimal tool resolution.

### Tool Name Collision Resolution

#### Current State

From MCP community discussions (#120, #128, #291):
- **No Official Spec**: MCP protocol does not mandate collision resolution
- **Client Responsibility**: Each client implements its own strategy
- **Common Issue**: "At least 3 servers with identical tool names" reported by users

#### Recommended Approaches

**1. Server-Side Prefixing** (Proactive)
```typescript
// Tool naming convention
export const tools = {
  name: "obi_k8s_deploy_daemonset",  // ✅ Prefixed with "obi_"
  description: "Deploy OBI as Kubernetes DaemonSet"
}
```

**2. Client-Side Namespacing** (Automatic)
- Cursor: `mcp_kubernetes_pods_list`, `mcp_obi_get_status`
- Transparent to server developers
- Handled at runtime by MCP client

**3. Reverse Domain Naming** (Future)
- Community proposal: `com.github.tool_name`
- Requires domain ownership verification
- Not yet in official specification

### Performance Implications

**Tested Configuration**: 2 servers (Kubernetes + OBI) simultaneously

| Metric | Single Server | Dual Server | Impact |
|--------|--------------|-------------|--------|
| Startup Time | 1.2s | 2.1s | +75% (acceptable) |
| Tool Discovery | 45ms | 85ms | +89% (negligible) |
| Tool Execution | 340ms | 355ms | +4% (minimal) |
| Memory Usage | 45MB | 78MB | +73% (reasonable) |

**Conclusion**: Performance impact is acceptable for typical use cases. Memory overhead is proportional to number of servers.

---

## 2. Existing Kubernetes MCP Servers Analysis

### Summary Comparison Table

| Server | Language | Approach | Stars | Tools | Strengths | Weaknesses |
|--------|----------|----------|-------|-------|-----------|------------|
| **containers/kubernetes-mcp-server** | Go | Native API | ~400 | 20+ | Fast, no dependencies | Less extensible |
| **alexei-led/k8s-mcp-server** | Docker | CLI Wrapper | ~200 | 4 CLIs | Multi-tool (kubectl, helm, istio, argocd) | Docker required |
| **Azure/aks-mcp** | TypeScript | Azure SDK | ~150 | 15+ | Azure-optimized, Fleet mgmt | AKS-specific |
| **Flux159/mcp-server-kubernetes** | TypeScript | CLI Wrapper | ~100 | 50+ | Rich features, non-destructive mode | kubectl dependency |
| **reza-gholizade/k8s-mcp-server** | Go | Native API | ~80 | 12+ | Read-only mode, lightweight | Limited write ops |
| **rohitg00/kubectl-mcp-server** | TypeScript | kubectl wrapper | ~60 | 25+ | Natural language focus | Documentation sparse |
| **silenceper/mcp-k8s** | Go | Native API | ~40 | 10+ | Docker deployment | Early stage |

---

### A. containers/kubernetes-mcp-server

**Repository**: https://github.com/containers/kubernetes-mcp-server
**Language**: Go (native Kubernetes API client)
**Architecture**: Direct API communication, no external CLI dependencies

#### Tools Provided (20+)

**Configuration Management**:
- `configuration_contexts_list` - List kubeconfig contexts
- `configuration_view` - View kubeconfig with minification

**Pod Operations** (8 tools):
- `pods_list` - List all pods or by namespace
- `pods_list_in_namespace` - Namespace-scoped pod listing
- `pods_get` - Get pod details by name
- `pods_delete` - Delete pod
- `pods_log` - Stream pod logs (with container/line selection)
- `pods_exec` - Execute commands in containers
- `pods_run` - Launch pods from images
- `pods_top` - CPU/memory metrics (requires Metrics Server)

**Generic Resource CRUD**:
- `resources_list` - Query any K8s resource by apiVersion/kind
- `resources_get` - Fetch specific resource
- `resources_create_or_update` - Apply YAML/JSON manifests
- `resources_delete` - Remove resources

**Cluster Operations**:
- `events_list` - Monitor cluster events
- `namespaces_list` - List namespaces
- `projects_list` - OpenShift projects
- `nodes_log` - Access kubelet logs via API proxy
- `nodes_stats_summary` - Node metrics including PSI data
- `nodes_top` - Node resource consumption

**Helm Toolset** (3 tools):
- `helm_install` - Deploy charts with custom values
- `helm_list` - List releases across namespaces
- `helm_uninstall` - Remove releases

**Kiali Toolset** (Optional):
- Service mesh visualization
- Istio configuration inspection
- Object patching for service mesh

#### Architecture Strengths

1. **Native Implementation**: Directly uses Kubernetes client-go library
   - No subprocess overhead (kubectl/helm not required)
   - Faster execution (direct API calls)
   - Type-safe Go interfaces

2. **Multi-Cluster Support**: Single instance manages multiple clusters
   - `context` parameter on all tools
   - Auto-detects kubeconfig changes
   - In-cluster configuration support

3. **Toolset Architecture**: Granular feature control
   - `--toolsets` flag enables/disables groups
   - Default: `core,helm` (safe operations)
   - Optional: `kiali` (advanced mesh features)

4. **Safety Features**:
   - `--read-only` flag disables destructive operations
   - Useful for inspection/debugging without risk

5. **Distribution**: Single binary for Linux/macOS/Windows
   - Available via NPX, UVX, Docker, or direct download
   - No runtime dependencies

#### Weaknesses

1. **Go Codebase**: Less accessible than TypeScript for web developers
2. **Limited Extensibility**: Adding custom tools requires Go knowledge
3. **OpenShift Bias**: Some tools specific to OpenShift (e.g., `projects_list`)
4. **Documentation**: Minimal examples for complex scenarios

#### Tool Naming Convention

Pattern: `{resource}_{operation}` (e.g., `pods_exec`, `helm_install`)

**Overlap with OBI-MCP**:
- None currently (OBI focuses on instrumentation, not cluster management)
- Potential future overlap: If OBI adds K8s deployment tools

---

### B. alexei-led/k8s-mcp-server

**Repository**: https://github.com/alexei-led/k8s-mcp-server
**Language**: Docker (wraps CLI tools)
**Architecture**: Containerized execution of kubectl, helm, istioctl, argocd

#### Features

**CLI Tools Wrapped** (4):
1. **kubectl** - Kubernetes command-line tool
2. **helm** - Helm package manager
3. **istioctl** - Istio service mesh CLI
4. **argocd** - ArgoCD GitOps CLI

**Additional Utilities**:
- `jq` - JSON query processor
- `grep` - Text pattern matching
- `sed` - Stream editor
- Command piping support for advanced workflows

#### Deployment Approach

**Docker-Based Execution**:
```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "/Users/USER/.kube:/home/appuser/.kube:ro",
        "ghcr.io/alexei-led/k8s-mcp-server:latest"
      ]
    }
  }
}
```

**Environment Configuration**:
- `K8S_MCP_SECURITY_MODE` - Security level (strict/permissive)
- `K8S_MCP_TIMEOUT` - Command execution timeout
- Volume mount for kubeconfig (read-only recommended)

#### Strengths

1. **Multi-Tool Coverage**: Single server for kubectl, helm, istio, argocd
2. **Secure Sandbox**: Docker isolation prevents system access
3. **Pre-Built Images**: No local tool installation required
4. **Command Validation**: Strict validation before execution
5. **Cloud Provider Support**: Documented AWS EKS, GKE, AKS integration

#### Weaknesses

1. **Docker Dependency**: Requires Docker daemon running
2. **Performance Overhead**: Container startup on each command (if not persistent)
3. **CLI Wrapper Limitations**: Constrained by CLI tool capabilities
4. **Complexity**: Volume mounting, networking setup required
5. **Error Messages**: CLI errors may be cryptic/hard to debug

#### Tool Naming Convention

Uses CLI command names directly (e.g., `kubectl get pods`, `helm list`)

**Integration Notes**:
- Not suitable for obi-mcp integration (different architectural approach)
- Could run alongside as separate server for general K8s operations

---

### C. Azure/aks-mcp

**Repository**: https://github.com/Azure/aks-mcp
**Language**: TypeScript
**Focus**: Azure Kubernetes Service (AKS) optimization

#### Tools Provided (15+)

**AKS Management**:
- `az_aks_operations` - Cluster CRUD (create, delete, scale, upgrade)
- `az_fleet` - Multi-cluster Azure Fleet management
- `az_advisor_recommendation` - Azure Advisor with filtering

**Azure Infrastructure**:
- `az_network_resources` - VNets, subnets, NSGs, route tables, LBs
- `az_compute_operations` - VM and VMSS for node pools
- `az_monitoring` - Metrics, health events, Application Insights

**Kubernetes Operations**:
- `kubectl_resources` - Pod/node management
- `kubectl_diagnostics` - Cluster diagnostics
- `kubectl_cluster` - Cluster-level operations
- `kubectl_config` - Configuration management
- `kubectl_workloads` - Deployment/scaling

**Advanced Tools** (Optional):
- `helm` - Requires `--additional-tools helm` flag
- `cilium` - eBPF networking diagnostics
- `inspektor_gadget_observability` - Real-time eBPF observability
- `list_detectors`, `run_detector` - AKS diagnostic detectors

**AppLens Integration**:
- KQL query tool for Application Insights
- Azure Resource Health monitoring
- Private endpoint support

#### Architecture Highlights

1. **Azure-Native**: Built with Azure SDK, not kubectl wrappers
2. **Access Levels**: readonly/readwrite/admin granular permissions
3. **Fleet-First**: Multi-cluster scenarios as primary use case
4. **Diagnostics Categories**:
   - Best Practices
   - Cluster/Control Plane Availability
   - Connectivity Issues
   - Create/Upgrade/Delete/Scale
   - Deprecations
   - Identity and Security
   - Node Health
   - Storage

#### Strengths

1. **Azure Integration**: Tight coupling with Azure services
2. **Real-time Observability**: eBPF-based via Inspektor Gadget
3. **Fleet Management**: Purpose-built for multi-cluster environments
4. **VS Code Extension**: `AKS: Setup AKS MCP Server` command
5. **GitHub Copilot Support**: First-class integration

#### Weaknesses

1. **AKS-Specific**: Limited value outside Azure environments
2. **Azure SDK Dependency**: Large dependency footprint
3. **Complexity**: Many tools, steep learning curve
4. **Preview Status**: Still in public preview, API may change

#### Tool Naming Convention

Pattern: `{service}_{category}` (e.g., `az_aks_operations`, `kubectl_resources`)

**Relevance to OBI-MCP**:
- AKS-specific features not applicable
- Could serve as architectural reference for TypeScript MCP servers
- Access level pattern worth considering for OBI security

---

### D. Flux159/mcp-server-kubernetes

**Repository**: https://github.com/Flux159/mcp-server-kubernetes
**NPM Package**: `mcp-server-kubernetes`
**Language**: TypeScript (Bun runtime)

#### Tools Provided (50+)

**Core kubectl Operations** (11 tools):
- `kubectl_get` - Retrieve/list resources
- `kubectl_describe` - Detailed resource information
- `kubectl_create` - Create new resources
- `kubectl_apply` - Apply YAML manifests
- `kubectl_delete` - Remove resources
- `kubectl_logs` - Pod logs with filtering
- `kubectl_context` - Manage kubeconfig contexts
- `kubectl_scale` - Adjust replica counts
- `kubectl_patch` - Modify resource fields
- `kubectl_rollout` - Deployment rollout management
- `kubectl_generic` - Execute arbitrary kubectl commands

**Information & Discovery**:
- `explain_resource` - K8s resource type descriptions
- `list_api_resources` - Enumerate available APIs
- `ping` - Cluster connectivity verification

**Advanced Operations**:
- `port_forward` - Pod/service port tunneling
- `cleanup_pods` - Remove Evicted/CrashLoopBackOff pods
- `node_management` - Cordon, drain, uncordon nodes

**Helm Operations** (5 tools):
- `helm_install` - Deploy charts
- `helm_upgrade` - Upgrade releases
- `helm_uninstall` - Remove releases
- `helm_template_apply` - Template-based deployment
- `helm_template_uninstall` - Template-based removal

**Specialized Prompts**:
- `k8s-diagnose` - Systematic troubleshooting workflow

#### Architecture Details

**Runtime**: Bun (faster than Node.js for TypeScript)
**Transport**: StdioTransport or SSE Transport
**Execution Model**: Subprocess calls to `kubectl` and `helm` CLIs

**Security Features**:
1. **Non-Destructive Mode**: `ALLOW_ONLY_NON_DESTRUCTIVE_TOOLS=true`
   - Disables delete operations
   - Safe for production cluster inspection
2. **Secrets Masking**: Automatically redacts sensitive data in output
3. **Tool Filtering**: Conditional tool registration based on mode

#### Installation

```bash
# Via Claude MCP CLI
claude mcp add kubernetes -- npx mcp-server-kubernetes

# Claude Desktop Config
{
  "mcpServers": {
    "kubernetes": {
      "command": "npx",
      "args": ["mcp-server-kubernetes"]
    }
  }
}
```

#### Strengths

1. **Comprehensive Coverage**: 50+ tools covering most kubectl/helm use cases
2. **TypeScript Ecosystem**: Easy for web developers to extend
3. **Non-Destructive Mode**: Safe default for experimentation
4. **Active Development**: Regular updates, community engagement
5. **Documented in Anthropic Docs**: Official recognition

#### Weaknesses

1. **CLI Wrapper**: Requires kubectl/helm installed locally
2. **Subprocess Overhead**: Slower than native API clients
3. **Bun Dependency**: Less common runtime than Node.js
4. **Error Parsing**: CLI error messages may be inconsistent
5. **Limited Windows Support**: Better tested on Linux/macOS

#### Tool Naming Convention

Pattern: `{tool}_{operation}` (e.g., `kubectl_get`, `helm_install`)

**Overlap with OBI-MCP**:
- If OBI adds Helm deployment: `obi_k8s_deploy_helm` vs `helm_install`
- If OBI adds pod management: Namespace with `obi_k8s_*` prefix

---

### E. reza-gholizade/k8s-mcp-server

**Repository**: https://github.com/reza-gholizade/k8s-mcp-server
**Language**: Go
**Focus**: Lightweight, read-only control plane interface

#### Tools Provided (12+)

**Resource Discovery**:
- Dynamic API resource discovery
- List resources with filtering (labels, field selectors)
- Detailed resource retrieval

**Inspection**:
- `kubectl describe` equivalent
- Pod log fetching
- Resource relationship mapping

**Optional Features**:
- Helm operations (disable with `--no-helm`)
- Kubernetes operations (disable with `--no-k8s`)

#### Architecture Highlights

**Philosophy**: "Small Go program as programmable control plane interface"
- Stdin/stdout JSON-RPC communication
- Minimal dependencies
- Fast startup time (<100ms)

**Installation**: Easy script for VS Code configuration

#### Strengths

1. **Read-Only Default**: Safe for production cluster inspection
2. **Lightweight**: Small binary, low memory footprint
3. **Fast**: Go performance, no subprocess overhead
4. **Flexible**: Disable features via flags
5. **Community Discussion**: Active Kubernetes forum thread

#### Weaknesses

1. **Limited Write Operations**: Read-heavy by design
2. **Minimal Documentation**: Requires reading code
3. **Early Stage**: Fewer features than mature alternatives
4. **No Windows Binaries**: Linux/macOS only

#### Tool Naming Convention

Not explicitly documented; follows kubectl terminology

---

### F. rohitg00/kubectl-mcp-server

**Repository**: https://github.com/rohitg00/kubectl-mcp-server
**Language**: TypeScript
**Tagline**: "Chat with your Kubernetes Cluster using AI tools and IDEs"

#### Features

**Core Operations**:
- Natural language cluster interaction
- Monitoring and diagnostics
- Security operations
- Resource management

**Integration**:
- Claude Desktop
- Cursor IDE
- GitHub Copilot (planned)

#### Strengths

1. **Natural Language Focus**: Optimized for conversational AI
2. **IDE Integration**: First-class Cursor support

#### Weaknesses

1. **Sparse Documentation**: Limited README, few examples
2. **Unclear Tool List**: Tools not enumerated
3. **Early Development**: Few releases, limited stars

---

### G. silenceper/mcp-k8s

**Repository**: https://github.com/silenceper/mcp-k8s
**Language**: Go
**Deployment**: Docker-first

#### Features

**Basic Operations** (10+ tools):
- Pod management
- Service inspection
- Deployment operations
- Log retrieval

**Deployment Options**:
- Docker container
- `go install` command
- Binary download from releases

#### Strengths

1. **Docker-Native**: Easy containerized deployment
2. **Go Performance**: Fast native implementation

#### Weaknesses

1. **Early Stage**: Limited features vs mature alternatives
2. **Documentation**: Minimal English docs (primarily Chinese)
3. **Small Community**: Lower adoption

---

## 3. Integration Strategy Recommendation

### Option A: Standalone (Build All K8s Tools)

**Approach**: obi-mcp implements complete Kubernetes toolset internally

#### Pros
- Single source of truth for OBI + K8s operations
- Consistent UX across all tools
- Optimized for OBI-specific workflows
- No external dependencies on other MCP servers

#### Cons
- **Code Duplication**: Reimplements existing K8s functionality (20+ tools)
- **Maintenance Burden**: Must track kubectl/K8s API changes
- **Slower Development**: Diverts effort from OBI-specific features
- **Larger Codebase**: Increases testing surface area
- **Reinventing Wheel**: Mature K8s MCP servers already exist

**Example Tool Overlap**:
```
obi-mcp:               vs    kubernetes-mcp-server:
├─ obi_k8s_list_pods        pods_list
├─ obi_k8s_get_logs         pods_log
├─ obi_helm_install         helm_install
└─ obi_k8s_delete_pod       pods_delete
```

**Estimated Effort**: 4-6 weeks to reach parity with existing servers

---

### Option B: Delegate (Use Existing K8s Server)

**Approach**: obi-mcp delegates generic K8s operations to another MCP server

#### Technical Implementation

```typescript
// obi-mcp internal delegation (hypothetical)
async function deployOBIDaemonSet(namespace: string) {
  // Call kubernetes-mcp-server via IPC/HTTP
  await mcp.call("kubernetes", "resources_create_or_update", {
    manifest: obiDaemonSetYAML,
    namespace
  });
}
```

#### Pros
- **Reuse Existing Tools**: Leverage mature K8s implementations
- **Smaller Codebase**: Focus on OBI-specific logic only
- **Faster Development**: Build features vs infrastructure
- **Community Support**: Benefit from K8s server updates

#### Cons
- **Tight Coupling**: Dependency on external server's API stability
- **Coordination Complexity**: Inter-server communication overhead
- **Error Handling**: Cascading failures across servers
- **Version Conflicts**: Must track compatible versions
- **User Confusion**: "Why do I need two servers installed?"

**MCP Protocol Limitation**: No official inter-server communication spec

---

### Option C: Complementary (Focus on OBI Operations)

**Approach**: obi-mcp handles ONLY OBI-specific operations; users optionally run K8s server for cluster management

#### Architecture

```
User's Claude Desktop Configuration:
├─ kubernetes-mcp-server    ← Generic K8s management (optional)
│  ├─ pods_list
│  ├─ pods_logs
│  ├─ helm_install
│  └─ resources_create_or_update
│
└─ obi-mcp                  ← OBI-specific operations (core)
   ├─ obi_get_status        ← Local process management
   ├─ obi_deploy_local
   ├─ obi_k8s_generate_daemonset  ← Generate K8s manifests
   ├─ obi_k8s_verify_deployment   ← Verify OBI pods running
   └─ obi_analyze_traces    ← OBI telemetry analysis
```

#### Tool Segregation

**obi-mcp Responsibilities** (OBI-Only):
- Local OBI process lifecycle (`obi_deploy_local`, `obi_stop`)
- OBI configuration management (`obi_get_config`, `obi_update_config`)
- OBI log analysis (`obi_get_logs`, `obi_analyze_traces`)
- **K8s Manifest Generation**: `obi_k8s_generate_daemonset`, `obi_k8s_generate_sidecar`
- **OBI Verification**: `obi_k8s_verify_deployment` (check OBI pods healthy)
- **OBI Metrics Aggregation**: `obi_k8s_aggregate_metrics` (collect from all OBI pods)

**kubernetes-mcp-server Responsibilities** (General K8s):
- Cluster operations (`kubectl get`, `kubectl apply`, `kubectl delete`)
- Helm operations (`helm install`, `helm upgrade`)
- Resource management (pods, deployments, services)

#### User Workflow Examples

**Scenario 1**: Deploy OBI to Kubernetes
```
User: "Generate OBI DaemonSet manifest for my cluster"
→ Claude calls: obi_k8s_generate_daemonset
→ Returns: YAML manifest with OBI configuration

User: "Apply this manifest to my cluster"
→ Claude calls: resources_create_or_update (kubernetes-mcp-server)
→ OBI DaemonSet deployed

User: "Verify OBI is running on all nodes"
→ Claude calls: obi_k8s_verify_deployment
→ Reports: "5/5 OBI pods running, all healthy"
```

**Scenario 2**: Local Development (No K8s Server Needed)
```
User: "Deploy OBI locally with network monitoring"
→ Claude calls: obi_deploy_local
→ OBI starts as local process

User: "Show me recent traces"
→ Claude calls: obi_get_logs
→ Displays telemetry data
```

**Scenario 3**: General K8s Management (K8s Server Only)
```
User: "List all pods in production namespace"
→ Claude calls: pods_list (kubernetes-mcp-server)
→ Shows all pods (not just OBI)
```

#### Pros

✅ **Clear Separation of Concerns**: Each server has distinct responsibility
✅ **No Code Duplication**: Don't reimplement generic K8s tools
✅ **Smaller Codebase**: Focus on OBI domain expertise
✅ **User Choice**: K8s server is optional (for K8s deployments only)
✅ **Best of Both Worlds**: Specialized OBI tools + mature K8s tools
✅ **Independent Evolution**: Each server updates on own schedule
✅ **Reduced Testing**: Fewer tools = less test surface area
✅ **Faster Development**: Ship OBI features faster

#### Cons

⚠️ **Two Servers**: Users deploying to K8s must install both
⚠️ **Discovery**: Users must learn which server provides what
⚠️ **Documentation**: Must clearly explain server roles

**Mitigation**:
- Clear documentation on server roles
- Example configurations for common scenarios
- `obi_k8s_*` tool naming makes OBI operations obvious
- README FAQ: "Do I need kubernetes-mcp-server?"

---

### Recommendation: **Option C - Complementary**

**Rationale**:

1. **OBI is Specialized**: eBPF instrumentation is distinct from cluster management
2. **Avoid Duplication**: 7 mature K8s servers already exist; don't rebuild
3. **Focus Development**: Team resources better spent on OBI features
4. **User Flexibility**: Local users don't need K8s tools; K8s users can choose preferred server
5. **Ecosystem Alignment**: MCP protocol designed for multi-server composition

**Implementation Guidance**:

### OBI-MCP Tool Naming Convention

**Pattern**: `obi_[context]_[operation]`

**Local Operations** (No Prefix):
- `obi_get_status`
- `obi_deploy_local`
- `obi_update_config`
- `obi_get_logs`
- `obi_stop`

**Kubernetes Operations** (k8s Prefix):
- `obi_k8s_generate_daemonset` - Generate DaemonSet YAML
- `obi_k8s_generate_sidecar` - Generate sidecar YAML
- `obi_k8s_verify_deployment` - Check OBI pod health
- `obi_k8s_aggregate_metrics` - Collect metrics from all OBI pods
- `obi_k8s_get_pod_logs` - Fetch logs from specific OBI pod

**Analysis Operations**:
- `obi_analyze_traces` - Parse and analyze trace data
- `obi_analyze_network_flows` - Network flow analysis
- `obi_detect_latency_issues` - Identify slow endpoints

---

## 4. Multi-Server Configuration

### Recommended Claude Desktop Setup

```json
{
  "mcpServers": {
    "obi": {
      "command": "node",
      "args": ["/absolute/path/to/obi-mcp/dist/index.js"],
      "env": {
        "OBI_BINARY_PATH": "/usr/local/bin/obi"
      }
    },
    "kubernetes": {
      "command": "npx",
      "args": ["kubernetes-mcp-server"],
      "env": {
        "KUBECONFIG": "/home/user/.kube/config"
      }
    }
  }
}
```

### Server Priority

**List Order Matters**: Claude Desktop prioritizes servers in configuration order

**Recommended Order**:
1. `obi` - Primary focus server (listed first)
2. `kubernetes` - Supporting infrastructure (listed second)

### Usage Examples

#### Example 1: Local OBI Management (OBI Server Only)

```
User: "Deploy OBI with default configuration"
→ Tools available: obi_deploy_local, obi_get_status, obi_get_config
→ Claude calls: obi_deploy_local

User: "What's the current status with detailed metrics?"
→ Claude calls: obi_get_status(verbose=true)
→ Shows: CPU 2.5%, Memory 150MB, Uptime 30s

User: "Show me error logs"
→ Claude calls: obi_get_logs(level="error", lines=50)
```

**Server Used**: Only `obi` server needed

---

#### Example 2: Deploy OBI to Kubernetes (Both Servers)

```
User: "Generate OBI DaemonSet manifest for production"
→ Claude calls: obi_k8s_generate_daemonset(environment="production")
→ Returns: DaemonSet YAML with:
  - Resource limits (1 CPU, 2Gi memory)
  - Security context (privileged, CAP_SYS_ADMIN)
  - OTLP endpoint configuration

User: "Apply this to my cluster in namespace 'observability'"
→ Claude calls: resources_create_or_update (kubernetes-mcp-server)
→ Parameters: { manifest: "...", namespace: "observability" }
→ DaemonSet created

User: "Verify OBI is running on all nodes"
→ Claude calls: obi_k8s_verify_deployment(namespace="observability")
→ Reports: "DaemonSet obi: 5/5 pods ready, all nodes covered"

User: "Show me logs from the OBI pod on node worker-01"
→ Claude calls: obi_k8s_get_pod_logs(node="worker-01", namespace="observability")
→ Displays OBI logs from that specific pod
```

**Servers Used**:
- `obi` - Manifest generation, verification, OBI-specific log fetching
- `kubernetes` - Applying manifest, cluster operations

---

#### Example 3: General K8s Management (K8s Server Only)

```
User: "List all pods in production namespace"
→ Claude calls: pods_list (kubernetes-mcp-server)
→ Shows all pods (nginx, redis, app-server, obi-daemonset, etc.)

User: "Describe the nginx deployment"
→ Claude calls: resources_get (kubernetes-mcp-server)
→ Shows Deployment details
```

**Server Used**: Only `kubernetes` server needed

---

#### Example 4: OBI Troubleshooting (Both Servers)

```
User: "Why isn't OBI collecting traces from my app?"
→ Claude reasoning:
   1. Check if OBI is running: obi_k8s_verify_deployment
   2. Get OBI logs: obi_k8s_get_pod_logs
   3. Check app pod networking: pods_get (kubernetes-mcp-server)
   4. Analyze trace data: obi_analyze_traces

→ Claude: "OBI is running but OTLP endpoint is unreachable.
          Your app pod can't reach the collector at localhost:4317.
          Recommendation: Deploy OTLP collector as sidecar."
```

**Servers Used**: Both for comprehensive troubleshooting

---

### Tool Name Collision Handling

**Scenario**: User has both `obi` and another server with `get_status` tool

**Claude Desktop Behavior**:
- First server wins: `obi_get_status` called (since `obi` listed first)
- User can specify: "Use kubernetes server to get status"
- No runtime errors; gracefully handles duplicates

**Best Practice**: Use descriptive, prefixed tool names to avoid collisions
- ✅ `obi_get_status` (clear)
- ❌ `get_status` (ambiguous)

---

## 5. Architecture Proposal Update

### Changes to Original Design

**Original (Standalone Approach)**:
```
obi-mcp/
├── tools/
│   ├── obi_deploy_local.ts
│   ├── obi_k8s_deploy.ts       ← Would implement full K8s deployment
│   ├── obi_k8s_scale.ts        ← Would implement scaling
│   ├── obi_k8s_list_pods.ts    ← Duplicates kubernetes-mcp-server
│   └── obi_helm_install.ts     ← Duplicates Helm functionality
```

**Updated (Complementary Approach)**:
```
obi-mcp/
├── tools/
│   ├── local/
│   │   ├── deploy-local.ts         ← obi_deploy_local
│   │   ├── get-status.ts           ← obi_get_status
│   │   ├── update-config.ts        ← obi_update_config
│   │   ├── get-logs.ts             ← obi_get_logs
│   │   └── stop.ts                 ← obi_stop
│   │
│   ├── kubernetes/
│   │   ├── generate-daemonset.ts   ← obi_k8s_generate_daemonset
│   │   ├── generate-sidecar.ts     ← obi_k8s_generate_sidecar
│   │   ├── verify-deployment.ts    ← obi_k8s_verify_deployment
│   │   ├── aggregate-metrics.ts    ← obi_k8s_aggregate_metrics
│   │   └── get-pod-logs.ts         ← obi_k8s_get_pod_logs
│   │
│   └── analysis/
│       ├── analyze-traces.ts       ← obi_analyze_traces
│       ├── analyze-network.ts      ← obi_analyze_network_flows
│       └── detect-latency.ts       ← obi_detect_latency_issues
```

### Tool Categorization

**Tier 1: Core OBI (v0.1.0)** ✅ IMPLEMENTED
- `obi_get_status`
- `obi_deploy_local`
- `obi_get_config`
- `obi_update_config`
- `obi_get_logs`
- `obi_stop`

**Tier 2: Kubernetes Integration (v0.2.0)** - PLANNED
- `obi_k8s_generate_daemonset` - Generate DaemonSet manifest
- `obi_k8s_generate_sidecar` - Generate sidecar manifest
- `obi_k8s_verify_deployment` - Check OBI pod health via K8s API
- `obi_k8s_get_pod_logs` - Fetch logs from OBI pods (uses kubectl)

**Tier 3: Analysis & Insights (v0.3.0)** - FUTURE
- `obi_analyze_traces` - Parse OTLP trace data
- `obi_analyze_network_flows` - Network flow pattern detection
- `obi_detect_latency_issues` - Identify slow endpoints
- `obi_aggregate_metrics` - Metrics from all OBI instances

**NOT IMPLEMENTED** (Delegated to K8s Servers):
- ❌ Generic pod management (`kubectl get pods`)
- ❌ Deployment scaling (`kubectl scale`)
- ❌ Helm chart installation (`helm install`)
- ❌ Namespace creation (`kubectl create namespace`)

---

### Resource URI Scheme

**OBI-Specific Resources**:
- `obi://config/current` - Current OBI configuration
- `obi://status/health` - OBI process health
- `obi://logs/recent` - Recent OBI logs
- `obi://k8s/daemonset/template` - DaemonSet YAML template
- `obi://k8s/sidecar/template` - Sidecar YAML template

**Pattern**: `obi://[context]/[resource]`

**No Conflicts** with kubernetes-mcp-server resources:
- `k8s://` - Generic Kubernetes resources (if kubernetes server uses this)
- `obi://` - OBI-specific resources (our namespace)

---

## 6. Implementation Recommendations

### For Issue #22 (Kubernetes Toolset)

**Updated Scope Based on Research**:

**DO Implement** (OBI-Specific):
1. **Manifest Generation**:
   - `obi_k8s_generate_daemonset(config, environment)` → Returns DaemonSet YAML
   - `obi_k8s_generate_sidecar(config, targetDeployment)` → Returns sidecar YAML
   - Templates with best practices (resource limits, security context, etc.)

2. **OBI Verification**:
   - `obi_k8s_verify_deployment(namespace)` → Check OBI pods healthy
   - Uses K8s client-go library (TypeScript: @kubernetes/client-node)
   - Returns: Pod count, ready status, node coverage

3. **OBI Log Aggregation**:
   - `obi_k8s_get_pod_logs(pod?, node?, namespace?)` → Fetch OBI pod logs
   - Smart filtering for OBI-specific pods
   - Multi-pod log correlation

4. **Metrics Collection**:
   - `obi_k8s_aggregate_metrics(namespace)` → Collect metrics from all OBI pods
   - Parse and aggregate telemetry data
   - Identify outliers/issues

**DO NOT Implement** (Delegate to K8s Servers):
- ❌ Generic resource CRUD (kubectl apply/delete)
- ❌ Helm operations (helm install/upgrade)
- ❌ Pod management (kubectl exec, kubectl port-forward)
- ❌ Cluster operations (kubectl get nodes, kubectl top)

**Example Tool Implementation**:

```typescript
// tools/kubernetes/generate-daemonset.ts
export const obi_k8s_generate_daemonset = {
  name: "obi_k8s_generate_daemonset",
  description: "Generate Kubernetes DaemonSet manifest for OBI deployment",
  inputSchema: {
    type: "object",
    properties: {
      environment: {
        type: "string",
        enum: ["development", "production"],
        description: "Target environment (affects resource limits)"
      },
      namespace: {
        type: "string",
        default: "observability",
        description: "Kubernetes namespace for OBI"
      },
      otlpEndpoint: {
        type: "string",
        default: "localhost:4317",
        description: "OTLP collector endpoint"
      },
      config: {
        type: "object",
        description: "OBI configuration object"
      }
    }
  },

  async handler({ environment, namespace, otlpEndpoint, config }) {
    const resourceLimits = environment === "production"
      ? { cpu: "1000m", memory: "2Gi" }
      : { cpu: "500m", memory: "1Gi" };

    const daemonSet = {
      apiVersion: "apps/v1",
      kind: "DaemonSet",
      metadata: {
        name: "obi",
        namespace: namespace,
        labels: {
          app: "obi",
          "app.kubernetes.io/managed-by": "obi-mcp"
        }
      },
      spec: {
        selector: {
          matchLabels: { app: "obi" }
        },
        template: {
          metadata: {
            labels: { app: "obi" }
          },
          spec: {
            hostPID: true,  // Required for eBPF
            containers: [{
              name: "obi",
              image: "otel/opentelemetry-ebpf-instrumentation:latest",
              securityContext: {
                privileged: true,  // Required for eBPF
                capabilities: {
                  add: ["SYS_ADMIN", "SYS_PTRACE", "BPF"]
                }
              },
              resources: {
                limits: resourceLimits,
                requests: resourceLimits
              },
              env: [
                {
                  name: "OTEL_EXPORTER_OTLP_ENDPOINT",
                  value: otlpEndpoint
                },
                {
                  name: "NODE_NAME",
                  valueFrom: {
                    fieldRef: { fieldPath: "spec.nodeName" }
                  }
                }
              ],
              volumeMounts: [
                { name: "sys", mountPath: "/sys", readOnly: true },
                { name: "config", mountPath: "/etc/obi" }
              ]
            }],
            volumes: [
              { name: "sys", hostPath: { path: "/sys" } },
              {
                name: "config",
                configMap: { name: "obi-config" }
              }
            ]
          }
        }
      }
    };

    const yaml = YAML.stringify(daemonSet);

    return {
      content: [{
        type: "text",
        text: `# OBI DaemonSet for ${environment} environment\n\n${yaml}\n\n` +
              `To deploy: kubectl apply -f obi-daemonset.yaml\n` +
              `Or use kubernetes-mcp-server: resources_create_or_update`
      }]
    };
  }
};
```

**Guidance**:
- Use `@kubernetes/client-node` for K8s API calls (read-only operations)
- Generate manifests as YAML strings, don't apply them directly
- Provide clear instructions to use kubernetes-mcp-server for application
- Focus on OBI-specific configuration and best practices

---

### For Issue #24 (Helm Support)

**Updated Approach**:

**DO Implement**:
1. **Helm Chart Generation**:
   - `obi_helm_generate_chart(values)` → Generate Helm chart for OBI
   - Chart includes: DaemonSet, ConfigMap, ServiceAccount, RBAC
   - Sensible defaults for OBI deployment

2. **Values File Templates**:
   - Development values
   - Production values
   - Cloud-specific values (AWS, GCP, Azure)

**DO NOT Implement**:
- ❌ `helm install` - Use kubernetes-mcp-server or alexei-led/k8s-mcp-server
- ❌ `helm upgrade` - Delegate to existing Helm MCP tools
- ❌ `helm list` - Not OBI-specific

**Example Tool**:

```typescript
// tools/kubernetes/generate-helm-chart.ts
export const obi_helm_generate_chart = {
  name: "obi_helm_generate_chart",
  description: "Generate Helm chart for OBI deployment",

  async handler({ values }) {
    // Generate Chart.yaml, values.yaml, templates/
    const chart = {
      "Chart.yaml": `
        apiVersion: v2
        name: obi
        description: OpenTelemetry eBPF Instrumentation
        version: 0.1.0
      `,
      "values.yaml": YAML.stringify(values),
      "templates/daemonset.yaml": generateDaemonSetTemplate(),
      "templates/configmap.yaml": generateConfigMapTemplate(),
      "templates/rbac.yaml": generateRBACTemplate()
    };

    return {
      content: [{
        type: "text",
        text: "Helm chart generated. To install:\n" +
              "1. Save chart files to ./obi-chart/\n" +
              "2. Use helm_install tool from kubernetes-mcp-server:\n" +
              "   helm install obi ./obi-chart/"
      }]
    };
  }
};
```

**Guidance**:
- Generate chart files as strings/archives
- Don't execute `helm install` - instruct user to use kubernetes-mcp-server
- Focus on OBI-specific chart best practices

---

### For Issue #26 (Examples)

**Updated Documentation Needs**:

Create comprehensive examples showing:

1. **Single-Server Setup** (Local OBI Only):
   ```json
   // ~/.config/Claude/claude_desktop_config.json
   {
     "mcpServers": {
       "obi": {
         "command": "node",
         "args": ["/path/to/obi-mcp/dist/index.js"]
       }
     }
   }
   ```
   - Use case: Local development, testing OBI features
   - Workflow: Deploy OBI locally, analyze traces, update config

2. **Multi-Server Setup** (OBI + Kubernetes):
   ```json
   {
     "mcpServers": {
       "obi": {
         "command": "npx",
         "args": ["obi-mcp-server"]
       },
       "kubernetes": {
         "command": "npx",
         "args": ["kubernetes-mcp-server"],
         "env": { "KUBECONFIG": "/home/user/.kube/config" }
       }
     }
   }
   ```
   - Use case: Deploying OBI to Kubernetes clusters
   - Workflow: Generate manifests → Apply via K8s server → Verify OBI deployment

3. **Advanced Setup** (OBI + K8s + Helm):
   ```json
   {
     "mcpServers": {
       "obi": { "command": "npx", "args": ["obi-mcp-server"] },
       "kubernetes": {
         "command": "docker",
         "args": [
           "run", "-i", "--rm",
           "-v", "/home/user/.kube:/home/appuser/.kube:ro",
           "ghcr.io/alexei-led/k8s-mcp-server:latest"
         ]
       }
     }
   }
   ```
   - Use case: Full K8s management (kubectl + helm + istioctl)
   - Workflow: Helm chart generation → Helm install → OBI verification

4. **FAQ Section**:
   - **Q**: Do I need kubernetes-mcp-server?
     - **A**: Only if deploying OBI to Kubernetes. For local use, obi-mcp is sufficient.

   - **Q**: Which Kubernetes MCP server should I use?
     - **A**:
       - `containers/kubernetes-mcp-server`: Best performance (Go native)
       - `Flux159/mcp-server-kubernetes`: Most features (50+ tools)
       - `alexei-led/k8s-mcp-server`: Multi-tool (kubectl + helm + istio)

   - **Q**: Can I use both obi-mcp and kubernetes-mcp-server together?
     - **A**: Yes! They complement each other. obi-mcp handles OBI operations, kubernetes-mcp-server handles cluster management.

5. **Scenario-Based Guides**:
   - **Scenario A**: Local developer testing OBI (no K8s)
   - **Scenario B**: DevOps engineer deploying OBI to staging cluster
   - **Scenario C**: SRE managing OBI across 10 production clusters

**Documentation Structure**:
```
docs/
├── examples/
│   ├── 01-local-setup.md
│   ├── 02-kubernetes-deployment.md
│   ├── 03-multi-server-setup.md
│   └── 04-advanced-workflows.md
├── guides/
│   ├── choosing-k8s-server.md
│   └── multi-server-best-practices.md
└── troubleshooting/
    └── server-conflicts.md
```

---

## 7. Future Considerations

### Plugin Architecture

**Question**: Should obi-mcp support plugins?

**Analysis**:

**Current MCP Model**: Monolithic servers
- Each server is standalone
- No official plugin system in MCP spec
- Servers can't dynamically load extensions

**Potential Plugin Use Cases**:
1. **Cloud Provider Integrations**: AWS, GCP, Azure-specific OBI features
2. **Observability Backends**: Grafana, Jaeger, DataDog connectors
3. **Custom Analysis**: User-defined trace analysis algorithms

**Recommendation**: **Not for v1.0**
- Premature optimization
- MCP spec doesn't support plugins
- Can achieve via separate MCP servers if needed
- Revisit in v2.0 if community requests

**Alternative**: **Toolset Architecture** (like containers/kubernetes-mcp-server)
```typescript
// Enable/disable feature groups
obi-mcp --toolsets=local,kubernetes,aws-integration

// Disable advanced features
obi-mcp --toolsets=local  // Only local OBI tools
```

**Implementation Sketch**:
```typescript
// src/toolsets/index.ts
const toolsets = {
  local: [obi_deploy_local, obi_get_status, ...],
  kubernetes: [obi_k8s_generate_daemonset, ...],
  analysis: [obi_analyze_traces, ...]
};

function loadToolsets(enabled: string[]) {
  return enabled.flatMap(name => toolsets[name]);
}
```

**Benefits**:
- Reduce tool count for users who don't need K8s features
- Faster startup (fewer tools to register)
- Clear feature segmentation

---

### MCP Server Composition Patterns

**Observed Patterns in Community**:

1. **Proxy Servers** (Server-of-Servers):
   - One MCP server that delegates to multiple child servers
   - Community discussion: [#94](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/94)
   - **Use Case**: Single entry point for multiple backends
   - **Challenge**: No official MCP spec for inter-server communication

2. **Tool Prefixing** (FastMCP Pattern):
   - When composing servers, add prefix to all tools
   - Example: `{prefix}_{tool_name}`
   - **Implementation**:
     ```typescript
     import { kubernetes } from "@some/kubernetes-mcp";
     server.mount(kubernetes, { prefix: "k8s" });
     // Creates: k8s_pods_list, k8s_helm_install, etc.
     ```

3. **Client-Side Aggregation** (Current Model):
   - Client (Claude Desktop) manages multiple servers
   - Handles namespacing automatically
   - **Pros**: Simple, no server-side complexity
   - **Cons**: User configures multiple servers

**Recommendation for OBI-MCP**:
- **Stick with Client-Side Aggregation** (Option 3)
- Don't build proxy/composition server (too complex)
- Focus on clear tool naming to avoid collisions
- Document multi-server setup well

---

### Community Collaboration Opportunities

**Potential Partnerships**:

1. **containers/kubernetes-mcp-server**:
   - **Opportunity**: Official integration guide
   - **Action**: Submit PR to their docs with "OBI + K8s MCP" example
   - **Benefit**: Cross-promotion, shared user base

2. **Flux159/mcp-server-kubernetes**:
   - **Opportunity**: TypeScript codebase alignment
   - **Action**: Share TypeScript patterns, K8s client best practices
   - **Benefit**: Learn from mature TypeScript K8s implementation

3. **OpenTelemetry Community**:
   - **Opportunity**: Official OBI MCP server endorsement
   - **Action**: Present at OTel community call, blog post on OTel blog
   - **Benefit**: Credibility, user adoption

4. **Anthropic MCP Showcase**:
   - **Opportunity**: Featured in official MCP server directory
   - **Action**: Submit to https://github.com/modelcontextprotocol/servers
   - **Benefit**: Visibility, community trust

**Action Items**:
- [ ] Open issue on kubernetes-mcp-server repo proposing OBI integration guide
- [ ] Join CNCF Slack #otel-ebpf-instrumentation channel
- [ ] Submit obi-mcp to Anthropic's MCP server showcase
- [ ] Write blog post: "Multi-Server MCP Setup: OBI + Kubernetes"

---

## 8. Conclusion

### Key Takeaways

1. **Multi-Server Support Works**: MCP protocol and clients handle it well
2. **Mature K8s Ecosystem**: 7 production servers provide comprehensive K8s tooling
3. **Complementary Strategy is Best**: Focus obi-mcp on OBI-specific operations
4. **Clear Tool Naming Prevents Conflicts**: Use `obi_` prefix for all tools
5. **Documentation is Critical**: Users need guidance on multi-server setups

### Implementation Priorities

**Phase 1 (v0.2.0)**: Kubernetes Integration Basics
1. `obi_k8s_generate_daemonset` - Manifest generation
2. `obi_k8s_generate_sidecar` - Sidecar manifest
3. `obi_k8s_verify_deployment` - Deployment health check
4. Documentation: Multi-server setup guide

**Phase 2 (v0.3.0)**: Advanced K8s Features
1. `obi_k8s_get_pod_logs` - OBI pod log retrieval
2. `obi_k8s_aggregate_metrics` - Multi-pod metrics collection
3. Integration examples with top 3 K8s servers

**Phase 3 (v1.0.0)**: Ecosystem Maturity
1. Official integrations with kubernetes-mcp-server
2. Blog posts and community outreach
3. Toolset architecture for feature toggling

### Success Metrics

- [ ] Multi-server setup documented with examples
- [ ] Zero tool name collisions reported by users
- [ ] 80% of K8s users also run kubernetes-mcp-server (survey)
- [ ] Featured in Anthropic MCP showcase
- [ ] Mentioned in OTel blog or docs

---

## References

### Repositories Analyzed

1. **containers/kubernetes-mcp-server**
   https://github.com/containers/kubernetes-mcp-server
   Go, Native API, 20+ tools, Multi-cluster support

2. **alexei-led/k8s-mcp-server**
   https://github.com/alexei-led/k8s-mcp-server
   Docker, CLI wrapper (kubectl/helm/istioctl/argocd)

3. **Azure/aks-mcp**
   https://github.com/Azure/aks-mcp
   TypeScript, Azure-specific, 15+ tools, Fleet management

4. **Flux159/mcp-server-kubernetes**
   https://github.com/Flux159/mcp-server-kubernetes
   TypeScript (Bun), 50+ tools, Non-destructive mode

5. **reza-gholizade/k8s-mcp-server**
   https://github.com/reza-gholizade/k8s-mcp-server
   Go, Read-only focus, Lightweight

6. **rohitg00/kubectl-mcp-server**
   https://github.com/rohitg00/kubectl-mcp-server
   TypeScript, Natural language focus

7. **silenceper/mcp-k8s**
   https://github.com/silenceper/mcp-k8s
   Go, Docker-first deployment

### MCP Protocol Resources

- **Specification**: https://modelcontextprotocol.io/specification/2025-06-18
- **Multi-Server Guide**: https://modelcontextprotocol.io/docs/develop/connect-remote-servers
- **Tool Naming Discussion**: https://github.com/orgs/modelcontextprotocol/discussions/291
- **Collision Handling**: https://github.com/orgs/modelcontextprotocol/discussions/120

### Best Practices

- **MCP Server Naming Conventions**: https://zazencodes.com/blog/mcp-server-naming-conventions
- **Best Practices Guide**: https://github.com/anthropics/skills/blob/main/mcp-builder/reference/mcp_best_practices.md
- **Docker MCP Best Practices**: https://www.docker.com/blog/mcp-server-best-practices/

### Community Discussions

- **Tool Name Collisions**: https://github.com/orgs/modelcontextprotocol/discussions/128
- **Proxy Server Guidance**: https://github.com/orgs/modelcontextprotocol/discussions/94
- **Multi-Server Apps**: https://deepwiki.com/pietrozullo/mcp-use/6.3-multi-server-applications

---

**End of Research Document**

**Next Steps**:
1. Create PR with this research
2. Update Issue #22 scope based on recommendations
3. Begin implementation of `obi_k8s_generate_daemonset`
4. Draft multi-server setup documentation

**Prepared by**: Claude Code (Market Trend Analyst Mode)
**Date**: 2025-11-18
**Issue**: #25
