# Kubernetes MCP Research Findings

**Date**: 2025-11-18
**Research Focus**: Existing Kubernetes MCP servers and their applicability to OBI management

## Executive Summary

Multiple production-ready Kubernetes MCP servers exist that enable AI-assisted cluster management. These servers provide patterns and architectures that should inform the design of Kubernetes support for obi-mcp. Two primary architectural approaches exist: **native API integration** and **CLI tool wrapping**.

## Key Findings

### Existing Kubernetes MCP Servers

1. **containers/kubernetes-mcp-server** (Red Hat/Containers)
   - **Architecture**: Native Go implementation using client-go
   - **Approach**: Direct Kubernetes API interaction
   - **Performance**: High performance, low latency (no subprocess overhead)
   - **Distribution**: Single binary for Linux, macOS, Windows
   - **Key Feature**: Multi-cluster support with context switching
   - **Security**: Configurable modes (read-only, non-destructive)
   - **Extensibility**: Toolset system for selective feature enablement
   - **GitHub**: https://github.com/containers/kubernetes-mcp-server

2. **alexei-led/k8s-mcp-server**
   - **Architecture**: Docker-based CLI tool wrapper
   - **Approach**: Wraps kubectl, helm, istioctl, argocd
   - **Security**: Strict command validation, non-root execution
   - **Tool Composition**: Supports piping with jq, grep, sed
   - **Configuration**: Environment variables for context/namespace
   - **GitHub**: https://github.com/alexei-led/k8s-mcp-server

3. **Azure/mcp-kubernetes**
   - **Focus**: Azure Kubernetes Service (AKS) integration
   - **Integration**: Claude, Cursor, GitHub Copilot
   - **GitHub**: https://github.com/Azure/mcp-kubernetes

4. **Flux159/mcp-server-kubernetes**
   - **Distribution**: NPM package
   - **Target**: Claude Desktop, mcp-chat
   - **GitHub**: https://github.com/Flux159/mcp-server-kubernetes

### Common Patterns

#### 1. Tool Organization

**Toolsets** (containers/kubernetes-mcp-server model):
- Core: Pod operations, resource CRUD, events, metrics
- Configuration: Context management, kubeconfig inspection
- Helm: Chart installation, release management
- Optional: Service mesh (Kiali, Istio)

**Operations** supported across implementations:
- List, get, create, update, delete resources
- Pod exec and log streaming
- Port forwarding
- Metrics collection
- Multi-cluster context switching

#### 2. Security Models

**Configurable access levels**:
- Read-only mode: Disable all write operations
- Non-destructive mode: Block delete/update actions
- Full access: Complete cluster control

**Execution isolation**:
- Sandboxed command execution
- Strict validation of parameters
- Non-root container execution

#### 3. Integration Points

**Supported AI tools**:
- Claude Desktop (primary)
- VS Code / Cursor
- GitHub Copilot
- Goose CLI agents

**MCP modes**:
- Stdio (default): Direct process communication
- HTTP Streaming: `/mcp` endpoint
- Server-Sent Events: `/sse` endpoint

### Architecture Comparison

| Feature | Native API (containers/k8s-mcp) | CLI Wrapper (alexei-led/k8s-mcp) |
|---------|----------------------------------|----------------------------------|
| **Performance** | High (direct API calls) | Medium (subprocess overhead) |
| **Dependencies** | None (single binary) | Docker, CLI tools |
| **Implementation** | Go client-go library | Shell command execution |
| **Extensibility** | Custom toolsets | Additional CLI tools |
| **Security** | API-level controls | Command validation |
| **Resource Usage** | Low | Medium-High |
| **Learning Curve** | Requires K8s API knowledge | Familiar kubectl patterns |

## Relevance to OBI MCP

### Current OBI MCP Architecture

obi-mcp currently supports:
- **Local deployment only**: Standalone OBI process on host
- **Process management**: Start, stop, status monitoring
- **Configuration management**: Update OBI config files
- **Log access**: Query and filter OBI logs

### Gap Analysis

**Missing Kubernetes capabilities**:
1. Deploy OBI as DaemonSet to Kubernetes clusters
2. Manage OBI deployments across multiple clusters
3. Monitor OBI pod health and resource usage
4. Update OBI configuration via ConfigMaps
5. Access OBI logs from Kubernetes pods
6. Handle RBAC and ServiceAccount setup

## Recommended Approach

### Option 1: Standalone OBI-K8s MCP Server

Create a separate `obi-k8s-mcp-server` that focuses solely on Kubernetes deployments of OBI.

**Pros**:
- Clean separation of concerns
- Can leverage existing kubernetes-mcp patterns
- Easier to maintain
- Users can compose with other K8s MCP servers

**Cons**:
- Fragmented user experience
- Duplicate configuration management
- Two separate MCP servers to manage

### Option 2: Extend obi-mcp with Kubernetes Support

Add Kubernetes deployment capabilities to existing obi-mcp server.

**Pros**:
- Unified user experience
- Single MCP server for all OBI operations
- Consistent configuration model
- Local + K8s deployments in one tool

**Cons**:
- Increased complexity
- Larger dependency footprint
- More maintenance burden

### Option 3: Plugin Architecture

Implement a plugin/toolset system in obi-mcp similar to containers/kubernetes-mcp-server.

**Pros**:
- Flexible deployment model
- Users enable only needed features
- Future extensibility for other platforms
- Best of both worlds

**Cons**:
- Requires architectural refactoring
- More complex initial implementation

## Recommended Solution: Option 3 (Plugin Architecture)

Implement a **toolset-based architecture** in obi-mcp:

1. **Core Toolset**: Local OBI deployment (existing functionality)
2. **Kubernetes Toolset**: K8s DaemonSet/sidecar deployment (new)
3. **Docker Toolset**: Docker container deployment (future)
4. **Cloud Toolset**: Cloud-specific deployments (future)

### Implementation Strategy

**Phase 1: Refactor to Toolsets**
- Extract current functionality into "local" toolset
- Create toolset registration system
- Update MCP server to dynamically register tools

**Phase 2: Add Kubernetes Toolset**
- Implement K8s client (using client-go or kubectl wrapper)
- Add tools: deploy, status, logs, config for K8s
- Support DaemonSet and sidecar deployment modes
- Handle RBAC and ServiceAccount creation

**Phase 3: Configuration Unification**
- Support both local and K8s config formats
- Implement config converters
- Handle environment-specific settings

## Integration with Existing K8s MCP Servers

### Complementary Usage

obi-mcp should **complement**, not replace, existing Kubernetes MCP servers:

**Division of responsibility**:
- **kubernetes-mcp-server**: General cluster management
- **obi-mcp**: OBI-specific operations and configuration

**Example workflow**:
```
User: "Deploy OBI to my production cluster"
Claude (via obi-mcp): [Creates OBI DaemonSet with optimal config]

User: "What pods are running in the cluster?"
Claude (via kubernetes-mcp): [Lists all pods using native K8s MCP]

User: "Show me OBI logs from the frontend namespace"
Claude (via obi-mcp): [Filters OBI-specific logs intelligently]
```

### Potential Integration Points

1. **Shared Kubeconfig**: Both servers use same cluster context
2. **Resource Coordination**: OBI MCP creates resources, K8s MCP monitors them
3. **Complementary Tools**: OBI for OBI-specific, K8s for general operations

## Design Principles for obi-mcp K8s Support

1. **Opinionated Defaults**: Ship production-ready OBI configurations
2. **Security First**: Follow K8s security best practices (RBAC, PSP)
3. **Cloud Native**: Support Helm, Kustomize, operators
4. **Observable**: Integrate with Prometheus, Grafana
5. **Multi-Cluster**: Support fleet management patterns
6. **GitOps Ready**: Generate declarative manifests

## Next Steps

1. Create GitHub issues for obi-mcp with detailed implementation proposals
2. Design toolset architecture for obi-mcp
3. Prototype Kubernetes toolset implementation
4. Update this reference implementation to use enhanced obi-mcp

## References

- [containers/kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server)
- [alexei-led/k8s-mcp-server](https://github.com/alexei-led/k8s-mcp-server)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Kubernetes client-go](https://github.com/kubernetes/client-go)
- [OBI Kubernetes Deployment](https://opentelemetry.io/docs/zero-code/obi/setup/kubernetes/)
