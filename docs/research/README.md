# Documentation Index

This directory contains research, architecture proposals, and planning documents for the OBI MCP K3D reference implementation.

## Core Documents

### [CURRENT_VS_FUTURE_STATE.md](./CURRENT_VS_FUTURE_STATE.md)
**START HERE** - Explains the current manual Kubernetes deployment vs the future AI-assisted approach with obi-mcp.

**Key Points**:
- Current: OBI deployed as DaemonSet using kubectl
- Future: AI-assisted deployment through enhanced obi-mcp
- Migration path and comparison

### [KUBERNETES_MCP_RESEARCH.md](./KUBERNETES_MCP_RESEARCH.md)
Research findings on existing Kubernetes MCP servers and their applicability to OBI management.

**Contents**:
- Survey of existing Kubernetes MCP implementations
- Architecture patterns (native API vs CLI wrapper)
- Integration recommendations for obi-mcp
- Complementary usage strategies

### [OBI_MCP_K8S_ARCHITECTURE.md](./OBI_MCP_K8S_ARCHITECTURE.md)
Detailed architecture proposal for extending obi-mcp to support Kubernetes deployments.

**Contents**:
- Toolset-based design
- Kubernetes toolset detailed design
- Implementation phases (8 weeks)
- Testing strategy
- Migration path

### [GITHUB_ISSUES.md](./GITHUB_ISSUES.md)
Ready-to-use GitHub issues for obi-mcp enhancements.

**Issues Included**:
1. **Issue #1**: Refactor to toolset-based architecture
2. **Issue #2**: Add Kubernetes toolset
3. **Issue #3**: Add Docker toolset (future)
4. **Issue #4**: Helm chart support
5. **Issue #5**: Research integration with existing K8s MCP servers
6. **Issue #6**: Create Kubernetes deployment examples

## Quick Navigation

### For Users
- Want to understand the roadmap? → [CURRENT_VS_FUTURE_STATE.md](./CURRENT_VS_FUTURE_STATE.md)
- Want to deploy OBI now? → [../K3D_SETUP_GUIDE.md](../K3D_SETUP_GUIDE.md)
- Want quick start? → [../QUICKSTART.md](../QUICKSTART.md)

### For Developers
- Want to contribute to obi-mcp? → [GITHUB_ISSUES.md](./GITHUB_ISSUES.md)
- Want architecture details? → [OBI_MCP_K8S_ARCHITECTURE.md](./OBI_MCP_K8S_ARCHITECTURE.md)
- Want research context? → [KUBERNETES_MCP_RESEARCH.md](./KUBERNETES_MCP_RESEARCH.md)

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| CURRENT_VS_FUTURE_STATE.md | ✅ Complete | 2025-11-18 |
| KUBERNETES_MCP_RESEARCH.md | ✅ Complete | 2025-11-18 |
| OBI_MCP_K8S_ARCHITECTURE.md | ✅ Complete | 2025-11-18 |
| GITHUB_ISSUES.md | ✅ Complete | 2025-11-18 |

## Key Takeaways

1. **Current Implementation** (This Repo):
   - OBI deployed correctly as Kubernetes DaemonSet
   - Uses standard kubectl/Kubernetes tools
   - Provides working reference for learning

2. **Future Enhancement** (obi-mcp):
   - Will add AI-assisted deployment
   - Toolset-based architecture
   - Natural language management
   - Requires 8 weeks development (see issues)

3. **Integration Strategy**:
   - obi-mcp will complement existing K8s MCP servers
   - Specialized for OBI operations
   - Can work alongside general K8s management tools

## Related Resources

- [OBI Official Docs](https://opentelemetry.io/docs/zero-code/obi/)
- [OBI Kubernetes Setup](https://opentelemetry.io/docs/zero-code/obi/setup/kubernetes/)
- [obi-mcp Repository](https://github.com/raibid-labs/obi-mcp)
- [containers/kubernetes-mcp-server](https://github.com/containers/kubernetes-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
