# K3D Reference Implementation

**Complete, production-ready reference for deploying OBI to k3d clusters**

This is the most comprehensive example in the obi-mcp repository, demonstrating:
- Full observability stack deployment
- Integration with OBI MCP Server for AI-powered management
- Real-world usage patterns and troubleshooting
- Production-ready configurations

## Documentation

- **[Quick Start](./docs/QUICKSTART.md)** - Get running in 10 minutes
- **[Complete Setup Guide](./docs/SETUP_GUIDE.md)** - Comprehensive walkthrough
- **[Usage Examples](./docs/USAGE_EXAMPLES.md)** - 50+ examples with OBI MCP Server

## Quick Start (4 Commands)

```bash
# 1. Create cluster
./setup.sh

# 2. Deploy OBI
./deploy-obi.sh

# 3. Verify
./verify.sh

# 4. Use with AI
# Open Claude Code/Desktop and ask:
# "Deploy OBI to my k3d cluster and show me the metrics"
```

## What This Example Includes

1. **Shell Scripts**
   - `setup.sh` - Create and configure k3d cluster
   - `deploy-obi.sh` - Deploy OBI DaemonSet with RBAC
   - `verify.sh` - Verify deployment health
   - `teardown.sh` - Clean up all resources

2. **Kubernetes Manifests** (`manifests/`)
   - OBI DaemonSet with complete RBAC
   - OpenTelemetry Collector
   - Sample microservices application

3. **Comprehensive Documentation** (`docs/`)
   - Quick start guide
   - Detailed setup guide
   - Usage examples with OBI MCP Server

## Using with OBI MCP Server

This example demonstrates AI-powered OBI management:

```
You: "What's the status of OBI in my k3d cluster?"
Claude: [Uses obi_get_status to check health]

You: "Show me the network traffic between services"
Claude: [Uses obi_get_logs to analyze flows]

You: "Update OBI config to increase sampling rate"
Claude: [Uses obi_update_config and restarts]
```

See [Usage Examples](./docs/USAGE_EXAMPLES.md) for 50+ scenarios.

## Architecture

```
┌─────────────────────────────────────────┐
│         k3d Cluster (obi-demo)          │
│                                         │
│  ┌────────────┐      ┌────────────┐   │
│  │   Node 1   │      │   Node 2   │   │
│  │  (server)  │      │  (agent)   │   │
│  │            │      │            │   │
│  │  ┌──────┐  │      │  ┌──────┐  │   │
│  │  │ OBI  │──┼──────┼──│ OBI  │  │   │
│  │  │ Pod  │  │      │  │ Pod  │  │   │
│  │  └──────┘  │      │  └──────┘  │   │
│  └────────────┘      └────────────┘   │
│         │                   │         │
│         └───────┬───────────┘         │
│                 │ OTLP                │
│         ┌───────▼────────┐            │
│         │ OTLP Collector │            │
│         │ (observability)│            │
│         └────────────────┘            │
│                 │                     │
│         ┌───────▼────────┐            │
│         │  Sample App    │            │
│         │  (demo-app)    │            │
│         └────────────────┘            │
└─────────────────────────────────────────┘
         │
         │ MCP Protocol
         ▼
┌─────────────────────────────────────────┐
│         OBI MCP Server                  │
│    (AI-Powered Management)              │
└─────────────────────────────────────────┘
```

## Prerequisites

### Required

- **Operating System**: Linux (x86_64 or ARM64)
- **Kernel**: Linux 5.8+ (for eBPF support)
- **Docker**: v20.10+ (running and accessible)
- **k3d**: v5.0.0+ (installation instructions below)
- **kubectl**: v1.20+

### Install k3d

```bash
# Linux/macOS
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# macOS (Homebrew)
brew install k3d

# Verify installation
k3d version
```

### Install kubectl

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# macOS (Homebrew)
brew install kubectl

# Verify installation
kubectl version --client
```

## Files Overview

```
k3d/
├── README.md              # This file
├── cluster-config.yaml    # k3d cluster configuration
├── setup.sh              # Create and configure cluster
├── deploy-obi.sh         # Deploy OBI DaemonSet
├── verify.sh             # Verify deployment health
├── teardown.sh           # Clean up all resources
├── manifests/            # Production-ready Kubernetes manifests
│   ├── obi-daemonset.yaml    # OBI DaemonSet with RBAC
│   ├── otel-collector.yaml   # OpenTelemetry Collector
│   └── sample-app.yaml       # Sample microservices application
└── docs/                 # Comprehensive documentation
    ├── QUICKSTART.md         # 10-minute quick start
    ├── SETUP_GUIDE.md        # Complete setup guide
    └── USAGE_EXAMPLES.md     # 50+ usage examples
```

## Configuration Files

### Manifests

Production-ready Kubernetes manifests are provided in `manifests/`:

#### OBI DaemonSet (`obi-daemonset.yaml`)

Deploys OBI on every cluster node with:
- Complete RBAC setup (ServiceAccount, ClusterRole, ClusterRoleBinding)
- Privileged security context for eBPF operations
- Resource limits and requests
- Health checks and monitoring
- HostPID and HostNetwork access

**Key configurations:**
- Namespace: `observability`
- Image: `otel/ebpf-instrument:main`
- OTLP endpoint: `http://otel-collector.observability.svc.cluster.local:4317`

**Deploy:**
```bash
kubectl apply -f manifests/obi-daemonset.yaml
```

#### OpenTelemetry Collector (`otel-collector.yaml`)

OTLP collector for receiving metrics from OBI:
- Receives metrics on gRPC (4317) and HTTP (4318)
- Batch processing for efficiency
- Prometheus exporter on port 8889
- File exporter for debugging

**Deploy:**
```bash
kubectl apply -f manifests/otel-collector.yaml
```

#### Sample Application (`sample-app.yaml`)

Multi-tier demo application for testing OBI:
- Frontend: Nginx web server
- Backend: API service
- Database: PostgreSQL
- Cache: Redis
- Load Generator: Automated traffic

**Deploy:**
```bash
kubectl apply -f manifests/sample-app.yaml
```

### Quick Deploy All Components

```bash
# Deploy collector and sample app
kubectl apply -f manifests/otel-collector.yaml
kubectl apply -f manifests/sample-app.yaml

# Deploy OBI (after cluster is created)
kubectl apply -f manifests/obi-daemonset.yaml

# Verify all running
kubectl get pods -n observability
kubectl get pods -n demo-app
```

## Why k3d?

k3d is **recommended for local development** because:

- **Fast**: Cluster creation in ~30 seconds
- **Lightweight**: Minimal resource usage (512MB+ RAM)
- **Docker-native**: Uses Docker containers as nodes
- **Multi-node**: Easy to create multi-node clusters
- **Port forwarding**: Simple service exposure
- **Built-in registry**: Optional local registry support

## Optional: Automation with just

For power users, a `justfile` provides convenient shortcuts:

```bash
# Install just (if needed)
cargo install just  # or: brew install just

# View all commands
just --list

# Common workflows
just setup              # Create cluster + deploy collector + sample app
just deploy-obi         # Deploy OBI
just verify             # Verify deployment
just status             # Show all component status
just logs               # View OBI logs
just clean              # Teardown everything
```

See [`justfile`](./justfile) for all available commands.

## Next Steps

After deployment:
1. Read [Usage Examples](./docs/USAGE_EXAMPLES.md) for AI workflows
2. Explore the [Complete Setup Guide](./docs/SETUP_GUIDE.md) for advanced configs
3. Check [Troubleshooting](./docs/SETUP_GUIDE.md#troubleshooting) if issues arise

---

**Status**: Production-Ready Reference Implementation
**Tested With**: k3d v5.6.0, Kubernetes v1.27, OBI MCP Server v0.1.0
