# k3d Deployment Example

Complete guide for deploying OBI (OpenTelemetry eBPF Instrumentation) on k3d - a lightweight Kubernetes distribution running in Docker.

## Why k3d?

k3d is **recommended for local development** because:

- **Fast**: Cluster creation in ~30 seconds
- **Lightweight**: Minimal resource usage (512MB+ RAM)
- **Docker-native**: Uses Docker containers as nodes
- **Multi-node**: Easy to create multi-node clusters
- **Port forwarding**: Simple service exposure
- **Built-in registry**: Optional local registry support

## Quick Start

**4 commands to deploy OBI:**

```bash
cd examples/k3d
./setup.sh           # Create k3d cluster (~30s)
./deploy-obi.sh      # Deploy OBI DaemonSet (~1min)
./verify.sh          # Verify deployment
```

**Clean up:**

```bash
./teardown.sh        # Delete cluster and all resources
```

## Prerequisites

### Required

- **Operating System**: Linux (x86_64 or ARM64)
- **Kernel**: Linux 5.8+ (for eBPF support)
- **Docker**: v20.10+ (running and accessible)
- **k3d**: v5.0.0+ (installation instructions below)
- **kubectl**: v1.20+

### Optional

- **OpenTelemetry Collector**: For receiving telemetry (not required for basic testing)

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

### Verify Prerequisites

```bash
# Check kernel version (need 5.8+)
uname -r

# Check Docker
docker version

# Check k3d
k3d version

# Check kubectl
kubectl version --client

# Check available resources
free -h  # At least 2GB RAM recommended
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
└── manifests/            # Production-ready Kubernetes manifests
    ├── obi-daemonset.yaml    # OBI DaemonSet with RBAC
    ├── otel-collector.yaml   # OpenTelemetry Collector
    └── sample-app.yaml       # Sample microservices application
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

## Step-by-Step Guide

### 1. Create Cluster

```bash
./setup.sh
```

This script:
- Creates a k3d cluster named `obi-demo`
- Configures 1 server + 2 agent nodes
- Exposes OTLP port 4317
- Waits for cluster to be ready
- Creates `observability` namespace

**Behind the scenes:**
```bash
k3d cluster create obi-demo --config cluster-config.yaml
kubectl wait --for=condition=Ready nodes --all --timeout=120s
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

**Expected output:**
```
=== OBI Deployment Status ===
NAME   DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
obi    2         2         2       2            2

NAME        READY   STATUS    RESTARTS   AGE   NODE
obi-xxxxx   1/1     Running   0          30s   k3d-obi-demo-agent-0
obi-yyyyy   1/1     Running   0          30s   k3d-obi-demo-agent-1

=== OBI Logs ===
[obi-xxxxx] Starting OBI...
[obi-xxxxx] eBPF programs loaded successfully
[obi-yyyyy] Starting OBI...
[obi-yyyyy] eBPF programs loaded successfully
```

### 4. Inspect and Monitor

```bash
# Get detailed pod information
kubectl get pods -n observability -o wide

# Follow logs from all OBI pods
kubectl logs -n observability -l app=obi -f --all-containers=true

# Check DaemonSet configuration
kubectl describe daemonset -n observability obi

# Monitor resource usage
kubectl top pods -n observability -l app=obi

# Check events
kubectl get events -n observability --sort-by='.lastTimestamp'
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
# Cluster name
export CLUSTER_NAME="my-obi-cluster"

# Number of agent nodes
export AGENT_NODES=3

# OBI namespace
export OBI_NAMESPACE="observability"

# OBI image
export OBI_IMAGE="otel/ebpf-instrument:main"

# OTLP endpoint
export OTLP_ENDPOINT="http://otel-collector:4317"

# Resource limits
export OBI_CPU_LIMIT="500m"
export OBI_MEMORY_LIMIT="512Mi"

# Then run scripts
./setup.sh
./deploy-obi.sh
```

### Cluster Configuration

Edit `cluster-config.yaml` to customize cluster:

```yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: obi-demo
servers: 1          # Number of server nodes
agents: 2           # Number of agent nodes
ports:
  - port: 4317:4317  # OTLP gRPC port
    nodeFilters:
      - loadbalancer
  - port: 4318:4318  # OTLP HTTP port (optional)
    nodeFilters:
      - loadbalancer
```

### OBI Configuration

To use a custom OBI configuration file:

```bash
# Create ConfigMap from your config
kubectl create configmap obi-config \
  --from-file=config.yaml=./my-obi-config.yaml \
  -n observability

# Edit deploy-obi.sh to mount ConfigMap (see Advanced Usage section)
```

## Advanced Usage

### Multi-Node Testing

Create a larger cluster for testing OBI at scale:

```bash
# Create cluster with 5 agent nodes
k3d cluster create obi-scale \
  --agents 5 \
  --servers 1 \
  --port 4317:4317@loadbalancer

# Deploy OBI (will run on all 5 agents)
./deploy-obi.sh

# Verify all nodes have OBI
kubectl get pods -n observability -o wide
```

### Deploy with OTLP Collector

Deploy an OTLP collector to receive telemetry:

```bash
# Deploy collector
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
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
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
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
EOF

# Update OBI to use collector
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Check collector logs
kubectl logs -n observability -l app=otel-collector -f
```

### Custom OBI Config via ConfigMap

```bash
# Create custom config file
cat > obi-custom-config.yaml <<EOF
network:
  enable: true
  allowed_attributes:
    - http.method
    - http.status_code
    - http.target
  cidrs:
    - cidr: "0.0.0.0/0"
      allowed_attributes: ["*"]

attributes:
  kubernetes:
    enable: true

export:
  otlp:
    endpoint: "otel-collector:4317"
    protocol: "grpc"
EOF

# Create ConfigMap
kubectl create configmap obi-config \
  --from-file=config.yaml=obi-custom-config.yaml \
  -n observability

# Update DaemonSet to use ConfigMap
kubectl patch daemonset obi -n observability -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "obi",
            "volumeMounts": [
              {
                "name": "config",
                "mountPath": "/etc/obi"
              }
            ],
            "args": ["--config", "/etc/obi/config.yaml"]
          }
        ],
        "volumes": [
          {
            "name": "config",
            "configMap": {
              "name": "obi-config"
            }
          }
        ]
      }
    }
  }
}'
```

### Port Forwarding

Access OBI metrics directly:

```bash
# Forward OBI eBPF port
kubectl port-forward -n observability daemonset/obi 8080:8080

# Access metrics (in another terminal)
curl http://localhost:8080/metrics
```

## Troubleshooting

### Issue: Cluster creation fails

**Symptoms:**
```
ERRO[0000] Failed to create cluster: ...
```

**Solutions:**
```bash
# Check Docker is running
docker ps

# Clean up existing cluster
k3d cluster delete obi-demo

# Try with verbose logging
k3d cluster create obi-demo --config cluster-config.yaml --verbose

# Check Docker network conflicts
docker network ls
docker network prune
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

# Common error: "permission denied" loading eBPF
# Solution: Verify privileged mode is enabled
kubectl get daemonset -n observability obi -o yaml | grep privileged
# Should show: privileged: true

# Check pod events
kubectl describe pod -n observability <pod-name>

# Verify kernel version on nodes
kubectl run -it --rm debug --image=alpine --restart=Never -- \
  sh -c "uname -r"
# Should be 5.8+
```

### Issue: OTLP connection failures

**Symptoms:**
```
failed to connect to OTLP endpoint: connection refused
```

**Solutions:**
```bash
# Check if collector is deployed
kubectl get pods -n observability -l app=otel-collector

# Verify endpoint is reachable
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://otel-collector:4317

# Check OBI environment variables
kubectl get daemonset -n observability obi -o yaml | grep OTLP

# Update endpoint if needed
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```

### Issue: DaemonSet pods only on some nodes

**Symptoms:**
```
NAME   DESIRED   CURRENT   READY
obi    3         2         2
```

**Solutions:**
```bash
# Check node status
kubectl get nodes

# Check for taints
kubectl describe nodes | grep -i taint

# k3d server nodes are tainted by default
# To run on all nodes (including server):
kubectl patch daemonset obi -n observability -p '
{
  "spec": {
    "template": {
      "spec": {
        "tolerations": [
          {
            "key": "node-role.kubernetes.io/master",
            "operator": "Exists",
            "effect": "NoSchedule"
          }
        ]
      }
    }
  }
}'

# Check DaemonSet events
kubectl describe daemonset -n observability obi
```

### Issue: High resource usage

**Symptoms:**
```
OBI pods consuming too much CPU/memory
```

**Solutions:**
```bash
# Check current usage
kubectl top pods -n observability -l app=obi

# Add resource limits
kubectl patch daemonset obi -n observability -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [
          {
            "name": "obi",
            "resources": {
              "limits": {
                "cpu": "500m",
                "memory": "512Mi"
              },
              "requests": {
                "cpu": "100m",
                "memory": "128Mi"
              }
            }
          }
        ]
      }
    }
  }
}'

# Restart pods to apply changes
kubectl rollout restart daemonset/obi -n observability
```

### Issue: Can't access services from host

**Symptoms:**
```
Connection refused when accessing localhost:4317
```

**Solutions:**
```bash
# Verify port mapping
k3d cluster list
docker ps | grep k3d

# Recreate cluster with correct port mapping
k3d cluster delete obi-demo
k3d cluster create obi-demo \
  --port 4317:4317@loadbalancer \
  --port 4318:4318@loadbalancer

# Or use port-forward
kubectl port-forward -n observability svc/otel-collector 4317:4317
```

## Performance Considerations

### Resource Requirements

**Per OBI pod:**
- CPU: 100m-500m (varies with traffic)
- Memory: 128Mi-512Mi (varies with buffer size)
- Disk: Minimal (logs only)

**Cluster minimum:**
- 2GB RAM (for 3-node cluster)
- 2 CPU cores
- 10GB disk space

### Scaling Recommendations

**Small cluster (1-3 nodes):**
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

**Large cluster (10+ nodes):**
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

### Monitoring Tips

```bash
# Watch resource usage in real-time
watch kubectl top pods -n observability -l app=obi

# Get resource usage over time (requires metrics-server)
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods | jq

# Export metrics for analysis
kubectl top pods -n observability -l app=obi --no-headers > metrics.txt
```

## Cost Considerations

k3d is **free** and runs locally:

- **No cloud costs**: Everything runs on your machine
- **Low infrastructure costs**: Minimal resource usage
- **Fast iteration**: No cloud deployment delays
- **Offline capable**: Works without internet (after initial setup)

**Resource cost estimate:**
- CPU: ~2 cores
- RAM: ~2GB
- Disk: ~10GB
- Time: ~5 minutes setup

## Next Steps

After deploying OBI on k3d:

1. **Add sample applications** to generate telemetry
2. **Deploy OTLP collector** to receive and process data
3. **Add visualization** (Grafana, Jaeger, etc.)
4. **Test configurations** before production deployment
5. **Scale up** with more nodes to test performance

## Additional Resources

- [k3d Documentation](https://k3d.io/)
- [k3s Documentation](https://k3s.io/)
- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [OTLP Protocol](https://opentelemetry.io/docs/specs/otlp/)
- [Kubernetes DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/raibid-labs/obi-mcp/issues)
- **k3d Issues**: [k3d bug reports](https://github.com/k3d-io/k3d/issues)

---

**Ready to deploy?** Run `./setup.sh` to get started!
