# OBI MCP with K3D - Complete Setup Guide

This guide walks you through setting up a k3d (k3s in Docker) cluster and using obi-mcp to collect and analyze metrics from your Kubernetes workloads.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Install K3D](#step-1-install-k3d)
- [Step 2: Create K3D Cluster](#step-2-create-k3d-cluster)
- [Step 3: Install OBI Binary](#step-3-install-obi-binary)
- [Step 4: Setup OBI MCP Server](#step-4-setup-obi-mcp-server)
- [Step 5: Deploy Sample Application](#step-5-deploy-sample-application)
- [Step 6: Configure OBI for K3D](#step-6-configure-obi-for-k3d)
- [Step 7: Collect Metrics](#step-7-collect-metrics)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Kernel Version**: 5.8+ (required for eBPF support)
- **RAM**: Minimum 4GB, 8GB recommended
- **Disk Space**: At least 10GB free
- **CPU**: 2+ cores recommended

### Required Tools

- **Docker**: Version 20.10+
- **kubectl**: Latest stable version
- **Node.js**: Version 18.0.0+
- **npm**: Version 9.0.0+

### Check Your System

```bash
# Check kernel version (must be 5.8+)
uname -r

# Check Docker is installed and running
docker --version
docker ps

# Check kubectl is installed
kubectl version --client

# Check Node.js version
node --version
npm --version
```

---

## Step 1: Install K3D

K3D is a lightweight wrapper to run k3s (Rancher Lab's minimal Kubernetes distribution) in Docker.

### Installation

```bash
# Download and install k3d
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Verify installation
k3d version
```

### Alternative: Install via Package Manager

**On Ubuntu/Debian:**
```bash
wget -q -O - https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
```

**On macOS:**
```bash
brew install k3d
```

**Manual Installation:**
```bash
# Download the latest release
curl -Lo k3d https://github.com/k3d-io/k3d/releases/latest/download/k3d-linux-amd64

# Make it executable
chmod +x k3d

# Move to PATH
sudo mv k3d /usr/local/bin/
```

---

## Step 2: Create K3D Cluster

Create a k3d cluster optimized for observability and OBI integration.

### Basic Cluster Creation

```bash
# Create a simple cluster named 'obi-demo'
k3d cluster create obi-demo \
  --agents 2 \
  --port "8080:80@loadbalancer" \
  --port "4317:4317@server:0" \
  --k3s-arg "--disable=traefik@server:0"

# Verify cluster is running
k3d cluster list
kubectl cluster-info
kubectl get nodes
```

### Advanced Cluster Configuration

For a more production-like setup with OBI-specific requirements:

```bash
# Create cluster with custom configuration
k3d cluster create obi-demo \
  --agents 3 \
  --servers 1 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer" \
  --port "4317:4317@server:0" \
  --port "4318:4318@server:0" \
  --volume "/sys/kernel/debug:/sys/kernel/debug:rw@all" \
  --k3s-arg "--disable=traefik@server:0" \
  --k3s-arg "--kube-proxy-arg=conntrack-max-per-core=0@server:0"

# Set kubectl context
kubectl config use-context k3d-obi-demo

# Verify nodes are ready
kubectl get nodes -o wide
```

### Cluster Configuration Explanation

- `--agents 3`: Creates 3 worker nodes
- `--servers 1`: Creates 1 control plane node
- `--port "4317:4317@server:0"`: Exposes OTLP gRPC port
- `--port "4318:4318@server:0"`: Exposes OTLP HTTP port
- `--volume "/sys/kernel/debug:..."`: Mounts kernel debug filesystem (required for eBPF)
- `--disable=traefik`: Disables default ingress controller

---

## Step 3: Install OBI Binary

OBI (OpenTelemetry eBPF Instrumentation) requires installation on your host system (not inside the cluster).

### Download OBI Binary

```bash
# Create directory for OBI
sudo mkdir -p /opt/obi
cd /opt/obi

# Download the latest OBI binary (replace with actual download URL when available)
# Note: OBI is currently in development. Use the following placeholder:
sudo wget https://github.com/open-telemetry/opentelemetry-ebpf/releases/download/v0.1.0/obi-linux-amd64 -O obi

# Make it executable
sudo chmod +x obi

# Create symlink for easier access
sudo ln -sf /opt/obi/obi /usr/local/bin/obi

# Verify installation
obi --version
```

### Alternative: Build from Source

If OBI binary is not available for your system:

```bash
# Clone the repository
git clone https://github.com/open-telemetry/opentelemetry-ebpf.git
cd opentelemetry-ebpf

# Build OBI (requires Go 1.21+)
make build

# Install
sudo make install
```

### Set Required Capabilities

OBI requires specific Linux capabilities to load eBPF programs:

```bash
# Grant necessary capabilities (recommended)
sudo setcap cap_sys_admin,cap_sys_resource,cap_bpf,cap_perfmon+eip /usr/local/bin/obi

# Or run with sudo (less secure but simpler for testing)
# sudo obi ...
```

---

## Step 4: Setup OBI MCP Server

### Install OBI MCP Server

```bash
# Navigate to obi-mcp directory
cd ~/raibid-labs/obi-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Verify build
ls -la dist/
```

### Configure MCP Client (Claude Desktop)

Add obi-mcp server to your MCP client configuration:

**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obi": {
      "command": "node",
      "args": ["/home/beengud/raibid-labs/obi-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info",
        "OBI_BINARY_PATH": "/usr/local/bin/obi"
      }
    }
  }
}
```

**Restart Claude Desktop** after updating the configuration.

### Verify MCP Server

In Claude Desktop, ask:
```
What OBI tools are available?
```

You should see 6 tools listed:
- obi_get_status
- obi_deploy_local
- obi_get_config
- obi_update_config
- obi_get_logs
- obi_stop

---

## Step 5: Deploy Sample Application

Deploy a sample application to generate observable traffic in your k3d cluster.

### Deploy OpenTelemetry Collector

First, deploy an OTLP collector to receive metrics from OBI:

```bash
# Create namespace
kubectl create namespace observability

# Apply the collector configuration (see manifests/otel-collector.yaml)
kubectl apply -f manifests/otel-collector.yaml

# Verify collector is running
kubectl get pods -n observability
kubectl logs -n observability -l app=otel-collector
```

### Deploy Sample Microservices

```bash
# Deploy sample application (see manifests/sample-app.yaml)
kubectl apply -f manifests/sample-app.yaml

# Verify deployment
kubectl get pods -n default
kubectl get services -n default

# Generate some traffic
kubectl run curl --image=curlimages/curl -i --rm --restart=Never -- \
  curl -s http://frontend-service:8080
```

---

## Step 6: Configure OBI for K3D

### Create OBI Configuration

Create a configuration file optimized for k3d monitoring:

```bash
# Copy the example configuration
cp manifests/obi-daemonset.yaml ~/obi-k3d-config.yml

# Edit if needed
nano ~/obi-k3d-config.yml
```

### Deploy OBI using MCP

In Claude Desktop, deploy OBI:

```
Deploy OBI using the configuration at ~/obi-k3d-config.yml
```

Or use the configuration object directly:

```
Deploy OBI with the following configuration:
- Enable network monitoring
- Enable Kubernetes metadata collection
- Export to OTLP endpoint at localhost:4317
- Monitor HTTP, gRPC protocols
```

### Verify OBI Deployment

```
Check OBI status with detailed metrics
```

You should see:
- Status: running
- PID: [process ID]
- CPU and Memory usage
- Configuration path

---

## Step 7: Collect Metrics

### Generate Traffic

Generate traffic in your k3d cluster to collect metrics:

```bash
# Continuous traffic generation
kubectl run load-generator --image=busybox --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://frontend-service:8080; sleep 1; done"

# Check pods
kubectl get pods
```

### View Collected Metrics

In Claude Desktop:

```
Show me the last 100 lines of OBI logs
```

```
Get the current OBI configuration
```

```
Check OBI status with detailed information
```

---

## Usage Examples

### Example 1: Monitor Service Communication

**Ask Claude:**
```
Show me OBI logs filtered by network events from the last 5 minutes
```

**Expected Output:**
You'll see network flow data showing communication between your k3d pods:
```
[INFO] network_flow: src=10.42.0.5 dst=10.42.0.10 proto=HTTP method=GET
[INFO] network_flow: src=10.42.0.10 dst=10.42.0.15 proto=gRPC service=backend.Service
```

### Example 2: Analyze Kubernetes Metadata

**Ask Claude:**
```
Show me recent logs and identify which Kubernetes services are communicating
```

**Expected Output:**
OBI logs enriched with Kubernetes metadata:
```
[INFO] k8s.src.namespace=default k8s.src.pod=frontend-xyz k8s.dst.service=backend-service
```

### Example 3: Update Configuration

**Ask Claude:**
```
Update the OBI configuration to also capture Redis protocol traffic and restart OBI
```

**Expected Behavior:**
- Configuration updated to include Redis in allowed protocols
- OBI process restarted automatically
- New configuration active

### Example 4: Troubleshoot Issues

**Ask Claude:**
```
OBI seems to have stopped. Can you diagnose the issue?
```

**Expected Behavior:**
Claude will:
1. Check OBI status
2. Review recent error logs
3. Provide diagnostic information
4. Suggest fixes

### Example 5: Compare Performance

**Before deploying a change:**
```
Show me current network flow statistics
```

**After deploying:**
```
Show me network flow statistics again and compare with previous baseline
```

---

## Troubleshooting

### K3D Cluster Issues

**Cluster won't start:**
```bash
# Check Docker is running
sudo systemctl status docker

# Remove and recreate cluster
k3d cluster delete obi-demo
k3d cluster create obi-demo --agents 2
```

**Pods stuck in Pending:**
```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod <pod-name>
```

### OBI Issues

**OBI fails to start - Permission denied:**
```bash
# Grant capabilities
sudo setcap cap_sys_admin,cap_sys_resource,cap_bpf,cap_perfmon+eip /usr/local/bin/obi

# Or run with sudo
sudo obi --config ~/obi-k3d-config.yml
```

**OBI fails to start - Kernel version:**
```bash
# Check kernel version
uname -r

# Must be 5.8 or higher. Upgrade if needed:
sudo apt update && sudo apt upgrade
```

**No metrics appearing:**
```bash
# Verify OBI is running
ps aux | grep obi

# Check OBI logs in Claude:
# "Show me OBI error logs"

# Verify network activity exists
kubectl get pods -A
kubectl logs <pod-name>
```

**OTLP endpoint connection failed:**
```bash
# Verify collector is running
kubectl get pods -n observability

# Check port forwarding
kubectl port-forward -n observability svc/otel-collector 4317:4317

# Test connection
telnet localhost 4317
```

### MCP Server Issues

**Claude doesn't see OBI tools:**
```bash
# Verify MCP server is built
ls -la ~/raibid-labs/obi-mcp/dist/index.js

# Check Claude Desktop config
cat ~/.config/Claude/claude_desktop_config.json

# Restart Claude Desktop completely
```

**MCP server crashes:**
```bash
# Check logs (if available in Claude Desktop)
# Or run server manually to see errors:
node ~/raibid-labs/obi-mcp/dist/index.js
```

### Network Issues

**Can't access services from outside cluster:**
```bash
# Verify port forwarding
k3d cluster list

# Port forward manually
kubectl port-forward svc/<service-name> 8080:80
```

**Pods can't communicate:**
```bash
# Check network policies
kubectl get networkpolicies -A

# Test pod-to-pod connectivity
kubectl exec -it <pod-name> -- ping <other-pod-ip>
```

---

## Next Steps

1. **Deploy Real Applications**: Replace sample app with your actual workloads
2. **Configure Dashboards**: Set up Grafana to visualize OBI metrics
3. **Set Up Alerts**: Configure alerting based on OBI telemetry
4. **Scale Testing**: Add more nodes and test OBI performance
5. **Production Hardening**: Review security and performance configurations

## Additional Resources

- [K3D Documentation](https://k3d.io/)
- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [OBI MCP Server README](~/raibid-labs/obi-mcp/README.md)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)

---

## Quick Reference Commands

```bash
# Cluster Management
k3d cluster create obi-demo --agents 2
k3d cluster list
k3d cluster delete obi-demo
kubectl get nodes

# Application Deployment
kubectl apply -f <file.yaml>
kubectl get pods -A
kubectl logs <pod-name>
kubectl delete -f <file.yaml>

# OBI Management (via Claude)
"Deploy OBI with config at ~/obi-k3d-config.yml"
"Check OBI status with details"
"Show me OBI logs"
"Stop OBI"

# Debugging
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
docker ps
docker logs <container-id>
```
