# minikube Deployment Example

Complete guide for deploying OBI (OpenTelemetry eBPF Instrumentation) on minikube - a tool for running local Kubernetes clusters on macOS, Linux, and Windows.

## Why minikube?

minikube is **recommended for cross-platform development** because:

- **Cross-platform**: Works on Linux, macOS, Windows
- **Multiple drivers**: Docker, VirtualBox, Hyper-V, KVM2, etc.
- **Full Kubernetes**: Complete Kubernetes distribution
- **Addons**: Built-in addons for common tools (metrics-server, dashboard, etc.)
- **Well-documented**: Extensive documentation and community support
- **Beginner-friendly**: Great for learning Kubernetes

## Quick Start

**4 commands to deploy OBI:**

```bash
cd examples/minikube
./setup.sh           # Create minikube cluster (~2min)
./deploy-obi.sh      # Deploy OBI DaemonSet (~1min)
./verify.sh          # Verify deployment
```

**Clean up:**

```bash
./teardown.sh        # Delete cluster and all resources
```

## Prerequisites

### Required

- **Operating System**: Linux, macOS, or Windows
- **Kernel**: Linux 5.8+ (for eBPF support - Linux only)
- **minikube**: v1.32.0+ (installation instructions below)
- **kubectl**: v1.20+
- **Container runtime**: Docker (recommended) or other driver

### Install minikube

```bash
# Linux (x86_64)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Linux (ARM64)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64
sudo install minikube-linux-arm64 /usr/local/bin/minikube

# macOS (Intel)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
sudo install minikube-darwin-amd64 /usr/local/bin/minikube

# macOS (Apple Silicon)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-arm64
sudo install minikube-darwin-arm64 /usr/local/bin/minikube

# macOS (Homebrew)
brew install minikube

# Windows (PowerShell as Administrator)
# Download from: https://storage.googleapis.com/minikube/releases/latest/minikube-installer.exe

# Verify installation
minikube version
```

### Install kubectl

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# macOS (Homebrew)
brew install kubectl

# Windows (via minikube)
minikube kubectl -- version

# Verify installation
kubectl version --client
```

### Verify Prerequisites

```bash
# Check kernel version (Linux only - need 5.8+)
uname -r

# Check Docker (if using Docker driver)
docker version

# Check minikube
minikube version

# Check kubectl
kubectl version --client

# Check available resources
free -h  # At least 4GB RAM recommended
```

## Files Overview

```
minikube/
├── README.md              # This file
├── setup.sh              # Create and configure cluster
├── deploy-obi.sh         # Deploy OBI DaemonSet
├── verify.sh             # Verify deployment health
└── teardown.sh           # Clean up all resources
```

## Step-by-Step Guide

### 1. Create Cluster

```bash
./setup.sh
```

This script:
- Creates a minikube cluster named `obi-demo`
- Configures resources (4GB RAM, 2 CPUs, 20GB disk)
- Uses Docker driver by default
- Waits for cluster to be ready
- Creates `observability` namespace
- Optionally enables metrics-server addon

**Behind the scenes:**
```bash
minikube start --profile=obi-demo \
  --driver=docker \
  --memory=4096 \
  --cpus=2 \
  --disk-size=20g \
  --kubernetes-version=stable
kubectl wait --for=condition=Ready nodes --all --timeout=180s
kubectl create namespace observability
```

### 2. Deploy OBI

```bash
./deploy-obi.sh
```

This script:
- Creates ServiceAccount with RBAC permissions
- Deploys OBI as a DaemonSet
- Configures security context for eBPF
- Sets up OTLP exporter endpoint
- Waits for pods to be ready

**What gets deployed:**
- **Namespace**: `observability`
- **ServiceAccount**: `obi` (identity for pods)
- **ClusterRole**: `obi` (permissions to list pods/services/nodes)
- **ClusterRoleBinding**: Links role to service account
- **DaemonSet**: `obi` (one pod per node)

### 3. Verify Deployment

```bash
./verify.sh
```

This script shows:
- DaemonSet status (desired vs. ready pods)
- Pod status on each node
- Recent logs from all OBI pods
- Health checks and common issue detection

### 4. Inspect and Monitor

```bash
# Get detailed pod information
kubectl get pods -n observability -o wide

# Follow logs from all OBI pods
kubectl logs -n observability -l app=obi -f --all-containers=true

# Check DaemonSet configuration
kubectl describe daemonset -n observability obi

# Monitor resource usage (requires metrics-server)
kubectl top pods -n observability -l app=obi

# Open Kubernetes dashboard
minikube dashboard
```

### 5. Clean Up

```bash
./teardown.sh
```

This deletes the entire cluster and all resources.

## Configuration Options

### Environment Variables

Customize deployment by setting environment variables before running scripts:

```bash
# minikube profile name
export MINIKUBE_PROFILE="my-obi-cluster"

# Driver (docker, virtualbox, hyperv, kvm2, etc.)
export MINIKUBE_DRIVER="docker"

# Resources
export MINIKUBE_MEMORY="8192"  # MB
export MINIKUBE_CPUS="4"
export MINIKUBE_DISK="30g"

# OBI configuration
export OBI_NAMESPACE="observability"
export OBI_IMAGE="otel/ebpf-instrument:main"
export OTLP_ENDPOINT="http://otel-collector:4317"
export OBI_CPU_LIMIT="500m"
export OBI_MEMORY_LIMIT="512Mi"

# Then run scripts
./setup.sh
./deploy-obi.sh
```

### Multi-Node Setup

minikube supports multi-node clusters (requires minikube v1.10.1+):

```bash
# Create 3-node cluster
minikube start --profile=obi-demo \
  --nodes=3 \
  --driver=docker \
  --memory=4096 \
  --cpus=2

# Verify nodes
kubectl get nodes
```

### Driver Selection

Choose the best driver for your OS:

**Linux:**
- `docker` (recommended) - Fast, easy, no VM
- `kvm2` - Better performance, requires KVM
- `virtualbox` - Cross-platform compatibility

**macOS:**
- `docker` (recommended) - Fast and simple
- `hyperkit` - macOS-native hypervisor
- `virtualbox` - Cross-platform compatibility

**Windows:**
- `docker` (recommended with WSL2)
- `hyperv` - Windows native
- `virtualbox` - Cross-platform compatibility

```bash
# Specify driver during setup
minikube start --profile=obi-demo --driver=kvm2
```

## Advanced Usage

### Enable Addons

minikube includes many useful addons:

```bash
# Enable metrics-server (for kubectl top)
minikube addons enable metrics-server

# Enable dashboard
minikube addons enable dashboard

# Enable ingress controller
minikube addons enable ingress

# List all addons
minikube addons list
```

### Deploy with OTLP Collector

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    exporters:
      logging:
        loglevel: debug

    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [logging]
        metrics:
          receivers: [otlp]
          exporters: [logging]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector:latest
        args: ["--config=/conf/config.yaml"]
        ports:
        - containerPort: 4317
        - containerPort: 4318
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
EOF

# Update OBI to use collector
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```

### Expose Services

```bash
# Get service URL (LoadBalancer/NodePort)
minikube service otel-collector -n observability --url

# Port forward to localhost
kubectl port-forward -n observability svc/otel-collector 4317:4317

# Tunnel (exposes LoadBalancer services)
minikube tunnel
```

### Access Docker Environment

```bash
# Configure shell to use minikube's Docker daemon
eval $(minikube docker-env)

# Build images directly in minikube
docker build -t my-app:latest .

# Reset to host Docker
eval $(minikube docker-env -u)
```

## Troubleshooting

### Issue: minikube start fails

**Symptoms:**
```
Error starting cluster: ...
```

**Solutions:**
```bash
# Delete and recreate
minikube delete --profile=obi-demo
minikube start --profile=obi-demo

# Try different driver
minikube start --profile=obi-demo --driver=virtualbox

# Check system resources
free -h
df -h

# View detailed logs
minikube start --profile=obi-demo --alsologtostderr -v=7
```

### Issue: OBI pods not starting

**Symptoms:**
```
NAME        READY   STATUS             RESTARTS   AGE
obi-xxxxx   0/1     CrashLoopBackOff   5          2m
```

**Solutions:**
```bash
# Check pod logs
kubectl logs -n observability <pod-name>

# Verify kernel version (Linux)
minikube ssh "uname -r"
# Should be 5.8+

# Check privileged mode
kubectl get daemonset -n observability obi -o yaml | grep privileged
# Should show: privileged: true

# Check pod events
kubectl describe pod -n observability <pod-name>
```

### Issue: Low disk space

**Symptoms:**
```
Error: disk space insufficient
```

**Solutions:**
```bash
# Clean up minikube
minikube delete --all

# Clean up Docker
docker system prune -a

# Increase disk size
minikube start --profile=obi-demo --disk-size=40g
```

### Issue: Cannot access services

**Symptoms:**
```
Connection refused when accessing services
```

**Solutions:**
```bash
# Use minikube service command
minikube service otel-collector -n observability

# Or use kubectl port-forward
kubectl port-forward -n observability svc/otel-collector 4317:4317

# Or use minikube tunnel (requires sudo)
minikube tunnel
```

### Issue: Slow performance

**Solutions:**
```bash
# Increase resources
minikube stop
minikube delete --profile=obi-demo
minikube start --profile=obi-demo --memory=8192 --cpus=4

# Use different driver (KVM on Linux, HyperKit on macOS)
minikube start --profile=obi-demo --driver=kvm2

# Disable unnecessary addons
minikube addons disable <addon-name>
```

## Performance Considerations

### Resource Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB

**Recommended:**
- CPU: 4 cores
- RAM: 8GB
- Disk: 40GB

### Resource Limits per OBI Pod

**Small cluster:**
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

**Large cluster:**
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

## Cost Considerations

minikube is **free** and runs locally:

- **No cloud costs**: Everything runs on your machine
- **Low infrastructure costs**: Uses existing hardware
- **Offline capable**: Works without internet (after initial setup)

**Resource cost estimate:**
- CPU: 2-4 cores
- RAM: 4-8GB
- Disk: 20-40GB
- Time: ~5 minutes setup

## Platform-Specific Notes

### Linux

- **Best performance** with KVM2 driver
- eBPF fully supported (kernel 5.8+)
- No VM overhead with Docker driver

### macOS

- **Docker driver recommended** for ease of use
- HyperKit for native macOS virtualization
- eBPF limitations in VM (depends on VM kernel)

### Windows

- **WSL2 + Docker** recommended
- Hyper-V native Windows option
- eBPF support depends on WSL2 kernel version

## Next Steps

After deploying OBI on minikube:

1. **Deploy sample applications** to generate telemetry
2. **Add OTLP collector** to receive and process data
3. **Enable dashboard** (`minikube dashboard`)
4. **Add visualization** (Grafana, Jaeger, etc.)
5. **Test configurations** before production deployment

## Additional Resources

- [minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [OTLP Protocol](https://opentelemetry.io/docs/specs/otlp/)
- [Kubernetes DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/raibid-labs/obi-mcp/issues)
- **minikube Issues**: [minikube bug reports](https://github.com/kubernetes/minikube/issues)

---

**Ready to deploy?** Run `./setup.sh` to get started!
