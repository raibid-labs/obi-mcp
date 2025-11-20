# Kubernetes Deployment Examples

Complete, production-ready reference implementations for deploying OBI (OpenTelemetry eBPF Instrumentation) to various Kubernetes distributions.

## Recommended Starting Point

**[k3d Example](./k3d/)** is the most comprehensive reference implementation with:
- Complete documentation (Quick Start, Setup Guide, 50+ Usage Examples)
- Production-ready configurations (OBI DaemonSet, OTLP Collector, Sample App)
- AI-powered management examples with OBI MCP Server
- Optional automation tooling (justfile)

Start here if you want the complete reference experience.

## Quick Start

Choose your platform and get OBI running in minutes:

```bash
# k3d (Recommended for local development)
cd k3d && ./setup.sh && ./deploy-obi.sh

# kind (Great for CI/CD)
cd kind && ./setup.sh && ./deploy-obi.sh

# minikube (Cross-platform local development)
cd minikube && ./setup.sh && ./deploy-obi.sh
```

## Available Examples

### Local Development Platforms

| Platform | Best For | Setup Time | Resource Usage |
|----------|----------|------------|----------------|
| [k3d](./k3d/) | **Recommended** - Fast iteration, Docker-based | ~2 min | Low (512MB+) |
| [kind](./kind/) | CI/CD pipelines, testing | ~3 min | Low (1GB+) |
| [minikube](./minikube/) | Cross-platform development | ~4 min | Medium (2GB+) |

### Production Platforms (Coming Soon)

| Platform | Status | Use Case |
|----------|--------|----------|
| AWS EKS | Planned | Production cloud deployment |
| GCP GKE | Planned | Production cloud deployment |
| Azure AKS | Planned | Production cloud deployment |
| Self-hosted | Planned | On-premise production |

## Platform Comparison

### k3d (Recommended for Development)

**Pros:**
- Fastest startup time
- Minimal resource usage
- Easy port forwarding
- Multi-node support
- Built-in registry support

**Cons:**
- Requires Docker
- Less feature-complete than full k8s

**Best for:** Rapid development, local testing, demo environments

[View k3d Example →](./k3d/)

---

### kind (Kubernetes in Docker)

**Pros:**
- True Kubernetes (not k3s)
- Perfect for CI/CD
- Multi-node support
- Excellent for testing

**Cons:**
- Slower than k3d
- Requires Docker
- More resource intensive

**Best for:** CI/CD pipelines, integration testing, conformance testing

[View kind Example →](./kind/)

---

### minikube

**Pros:**
- Cross-platform (Linux, macOS, Windows)
- Multiple driver options (Docker, VirtualBox, etc.)
- Built-in addons
- Well-documented

**Cons:**
- Slower startup
- Single-node by default
- More complex networking

**Best for:** Cross-platform development, learning Kubernetes

[View minikube Example →](./minikube/)

## What Each Example Includes

Every example provides:

1. **Complete Setup Scripts**
   - `setup.sh` - Create and configure cluster
   - `deploy-obi.sh` - Deploy OBI with all dependencies
   - `verify.sh` - Verify deployment health
   - `teardown.sh` - Clean up all resources

2. **Comprehensive Documentation**
   - Prerequisites checklist
   - Quick start (4 commands or less)
   - Step-by-step walkthrough
   - Configuration options
   - Troubleshooting guide
   - Platform-specific notes

3. **Production-Ready Configurations**
   - RBAC setup (ServiceAccount, ClusterRole, ClusterRoleBinding)
   - DaemonSet deployment for node-level instrumentation
   - Resource limits and requests
   - Health checks and monitoring
   - Security context (privileged mode for eBPF)

4. **Testing and Validation**
   - Deployment verification scripts
   - Log inspection tools
   - Health check validation
   - Sample application deployment (optional)

## Prerequisites

All examples require:

- **Operating System**: Linux (x86_64 or ARM64)
- **Kernel**: Linux 5.8+ (for eBPF support)
- **Tools**: `kubectl` (v1.20+), `bash`, `curl`
- **Platform-specific**: Docker, k3d/kind/minikube

### Verify Prerequisites

```bash
# Check kernel version
uname -r  # Should be 5.8+

# Check kubectl
kubectl version --client

# Check Docker (for k3d/kind)
docker version

# Check available resources
free -h  # At least 2GB RAM recommended
```

## Architecture Overview

All examples deploy OBI as a **DaemonSet**, ensuring one OBI pod runs on each cluster node:

```
┌─────────────────────────────────────────┐
│          Kubernetes Cluster             │
│                                         │
│  ┌────────────┐      ┌────────────┐   │
│  │   Node 1   │      │   Node 2   │   │
│  │            │      │            │   │
│  │  ┌──────┐  │      │  ┌──────┐  │   │
│  │  │ OBI  │  │      │  │ OBI  │  │   │
│  │  │ Pod  │  │      │  │ Pod  │  │   │
│  │  └──────┘  │      │  └──────┘  │   │
│  │     │      │      │     │      │   │
│  │     └──────┼──────┼─────┘      │   │
│  │            │      │            │   │
│  └────────────┘      └────────────┘   │
│         │                   │         │
│         └───────┬───────────┘         │
│                 │                     │
│         ┌───────▼────────┐            │
│         │ OTLP Collector │            │
│         │   (Optional)   │            │
│         └────────────────┘            │
└─────────────────────────────────────────┘
```

**Key Components:**

1. **Namespace**: `observability` - Isolated namespace for observability tools
2. **ServiceAccount**: `obi` - Identity for OBI pods
3. **ClusterRole**: `obi` - Permissions to list pods, services, nodes
4. **ClusterRoleBinding**: Binds ClusterRole to ServiceAccount
5. **DaemonSet**: `obi` - Runs OBI on every node
6. **SecurityContext**: Privileged mode (required for eBPF)
7. **HostPID/HostNetwork**: Node-level access (required for eBPF)

## Common Configuration Options

All examples support these configuration variables:

```bash
# Namespace
export OBI_NAMESPACE="observability"

# OBI Image
export OBI_IMAGE="otel/ebpf-instrument:main"

# OTLP Endpoint
export OTLP_ENDPOINT="http://localhost:4317"

# Resource Limits
export OBI_CPU_LIMIT="500m"
export OBI_MEMORY_LIMIT="512Mi"

# eBPF Port
export OBI_EBPF_PORT="8080"
```

## Deployment Workflow

Standard workflow for all platforms:

```bash
# 1. Create cluster
./setup.sh

# 2. Deploy OBI
./deploy-obi.sh

# 3. Verify deployment
./verify.sh

# 4. Inspect logs
kubectl logs -n observability -l app=obi

# 5. Clean up
./teardown.sh
```

## Troubleshooting

### Common Issues

#### 1. OBI Pods Not Starting

**Symptoms:**
```
kubectl get pods -n observability
NAME        READY   STATUS             RESTARTS   AGE
obi-xxxxx   0/1     CrashLoopBackOff   5          2m
```

**Solutions:**
```bash
# Check pod logs
kubectl logs -n observability <pod-name>

# Check events
kubectl describe pod -n observability <pod-name>

# Common causes:
# - Insufficient kernel version (need 5.8+)
# - Missing privileged mode
# - OTLP endpoint unreachable
# - Image pull errors
```

#### 2. Permission Denied Errors

**Symptoms:**
```
Error: failed to load eBPF programs: permission denied
```

**Solutions:**
```bash
# Verify privileged mode is enabled
kubectl get daemonset -n observability obi -o yaml | grep privileged

# Should show: privileged: true

# Verify security context
kubectl get pods -n observability -o yaml | grep -A 5 securityContext
```

#### 3. OTLP Connection Errors

**Symptoms:**
```
failed to connect to OTLP endpoint: connection refused
```

**Solutions:**
```bash
# Verify endpoint is reachable
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://localhost:4317

# Check OTLP collector deployment
kubectl get pods -n observability -l app=otel-collector

# Update endpoint in deployment
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
```

#### 4. Node Selector Issues

**Symptoms:**
```
0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector
```

**Solutions:**
```bash
# Check node labels
kubectl get nodes --show-labels

# Remove node selector if needed
kubectl patch daemonset obi -n observability -p '{"spec":{"template":{"spec":{"nodeSelector":null}}}}'
```

### Platform-Specific Troubleshooting

- **k3d**: See [k3d troubleshooting](./k3d/README.md#troubleshooting)
- **kind**: See [kind troubleshooting](./kind/README.md#troubleshooting)
- **minikube**: See [minikube troubleshooting](./minikube/README.md#troubleshooting)

## Advanced Usage

### Deploying with Helm

If you prefer Helm, see the [Helm chart documentation](../charts/obi/README.md):

```bash
helm install obi ../charts/obi \
  --namespace observability \
  --create-namespace
```

### Multi-Node Clusters

For testing OBI at scale:

```bash
# k3d with 3 agents
k3d cluster create obi-scale --agents 3

# kind with 3 workers
kind create cluster --config kind-multi-node.yaml

# minikube with 3 nodes
minikube start --nodes 3
```

### Custom OBI Configuration

All examples support custom OBI config:

```bash
# Create ConfigMap from file
kubectl create configmap obi-config \
  --from-file=config.yaml=./my-obi-config.yaml \
  -n observability

# Mount in DaemonSet (see individual examples)
```

### Monitoring OBI

Monitor OBI performance:

```bash
# Resource usage
kubectl top pods -n observability -l app=obi

# Logs (all nodes)
kubectl logs -n observability -l app=obi --all-containers=true

# Events
kubectl get events -n observability --sort-by='.lastTimestamp'
```

## Contributing

Found an issue or want to add support for a new platform?

1. Create an issue describing your use case
2. Follow the structure of existing examples
3. Ensure all scripts are executable (`chmod +x *.sh`)
4. Test thoroughly on a clean cluster
5. Add comprehensive troubleshooting section
6. Submit a pull request

## Additional Resources

- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [Kubernetes DaemonSet Best Practices](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [eBPF Prerequisites](https://ebpf.io/what-is-ebpf/#requirements)
- [OTLP Protocol](https://opentelemetry.io/docs/specs/otlp/)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/raibid-labs/obi-mcp/issues)
- **Slack**: `#otel-ebpf-instrumentation` on [CNCF Slack](https://slack.cncf.io/)
- **Discussions**: [GitHub Discussions](https://github.com/raibid-labs/obi-mcp/discussions)

---

**Need help?** Check the platform-specific READMEs or open an issue!
