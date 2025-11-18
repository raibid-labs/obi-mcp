# kind Deployment Example

Complete guide for deploying OBI (OpenTelemetry eBPF Instrumentation) on kind (Kubernetes IN Docker) - a tool for running local Kubernetes clusters using Docker container nodes.

## Why kind?

kind is **recommended for CI/CD and testing** because:

- **True Kubernetes**: Full Kubernetes API (not a lighter distribution)
- **Conformance**: CNCF certified Kubernetes conformance
- **CI/CD friendly**: Designed for testing Kubernetes itself
- **Multi-node**: Easy multi-node cluster setup
- **Reproducible**: Declarative cluster configuration
- **Fast**: Quick cluster creation and teardown

## Quick Start

**4 commands to deploy OBI:**

```bash
cd examples/kind
./setup.sh           # Create kind cluster (~1min)
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
- **kind**: v0.20.0+ (installation instructions below)
- **kubectl**: v1.20+

### Install kind

```bash
# Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# macOS (Intel)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-darwin-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# macOS (Apple Silicon)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-darwin-arm64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# macOS (Homebrew)
brew install kind

# Verify installation
kind version
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

# Check kind
kind version

# Check kubectl
kubectl version --client

# Check available resources
free -h  # At least 2GB RAM recommended
```

## Files Overview

```
kind/
├── README.md              # This file
├── cluster-config.yaml    # kind cluster configuration
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
- Creates a kind cluster named `obi-demo`
- Configures 1 control-plane + 2 worker nodes
- Sets up port mappings for OTLP (4317, 4318)
- Waits for cluster to be ready
- Creates `observability` namespace

**Behind the scenes:**
```bash
kind create cluster --name obi-demo --config cluster-config.yaml
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
- **DaemonSet**: `obi` (one pod per worker node)

### 3. Verify Deployment

```bash
./verify.sh
```

This script shows:
- DaemonSet status (desired vs. ready pods)
- Pod status on each node
- Recent logs from all OBI pods
- Health checks and common issue detection

**Expected output:**
```
=== DaemonSet Status ===
NAME   DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
obi    2         2         2       2            2

=== Pod Status ===
NAME        READY   STATUS    RESTARTS   AGE   NODE
obi-xxxxx   1/1     Running   0          30s   obi-demo-worker
obi-yyyyy   1/1     Running   0          30s   obi-demo-worker2

=== Recent Logs ===
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

# Number of worker nodes
export WORKER_NODES=3

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
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 4317  # OTLP gRPC
        hostPort: 4317
        protocol: TCP
      - containerPort: 4318  # OTLP HTTP
        hostPort: 4318
        protocol: TCP
  - role: worker
  - role: worker
  - role: worker  # Add more workers as needed
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
# Create cluster with 5 worker nodes
export WORKER_NODES=5
./setup.sh

# Deploy OBI (will run on all 5 workers)
./deploy-obi.sh

# Verify all nodes have OBI
kubectl get pods -n observability -o wide
```

### Deploy with OTLP Collector

Deploy an OTLP collector to receive telemetry:

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
      prometheus:
        endpoint: 0.0.0.0:8889

    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [logging]
        metrics:
          receivers: [otlp]
          exporters: [logging, prometheus]
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
        - containerPort: 8889
          name: prometheus
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
  - name: prometheus
    port: 8889
    targetPort: 8889
  type: ClusterIP
EOF

# Update OBI to use collector
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Check collector logs
kubectl logs -n observability -l app=otel-collector -f
```

### Load Balancer for OTLP Endpoint

Expose OTLP collector via LoadBalancer:

```bash
# Install MetalLB (bare-metal load balancer)
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml

# Wait for MetalLB to be ready
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s

# Configure MetalLB IP pool
kubectl apply -f - <<EOF
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: first-pool
  namespace: metallb-system
spec:
  addresses:
  - 172.18.255.200-172.18.255.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: empty
  namespace: metallb-system
EOF

# Expose collector with LoadBalancer
kubectl patch svc otel-collector -n observability -p '{"spec":{"type":"LoadBalancer"}}'

# Get LoadBalancer IP
kubectl get svc -n observability otel-collector
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
    - http.user_agent
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

logging:
    level: "info"
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

## Troubleshooting

### Issue: Cluster creation fails

**Symptoms:**
```
ERROR: failed to create cluster: ...
```

**Solutions:**
```bash
# Check Docker is running
docker ps

# Clean up existing cluster
kind delete cluster --name obi-demo

# Check Docker network
docker network ls
docker network inspect kind

# Try with verbose logging
kind create cluster --name obi-demo --config cluster-config.yaml -v 10

# Check available disk space
df -h
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

# Verify kernel version on nodes (should be 5.8+)
docker exec obi-demo-worker uname -r
```

### Issue: Pods only on worker nodes

**Symptoms:**
```
OBI pods not running on control-plane node
```

**Solutions:**
```bash
# By default, control-plane nodes are tainted
# This is expected behavior - OBI should run on workers

# To run on control-plane (not recommended for production):
kubectl taint nodes obi-demo-control-plane \
  node-role.kubernetes.io/control-plane:NoSchedule-

# Or add toleration to DaemonSet:
kubectl patch daemonset obi -n observability -p '
{
  "spec": {
    "template": {
      "spec": {
        "tolerations": [
          {
            "key": "node-role.kubernetes.io/control-plane",
            "operator": "Exists",
            "effect": "NoSchedule"
          }
        ]
      }
    }
  }
}'
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

# Verify service exists
kubectl get svc -n observability otel-collector

# Test connectivity from OBI pod
kubectl exec -it -n observability <obi-pod> -- \
  wget -O- http://otel-collector:4317 || echo "Cannot connect"

# Check OBI environment variables
kubectl get daemonset -n observability obi -o yaml | grep OTLP

# Update endpoint if needed
kubectl set env daemonset/obi -n observability \
  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```

### Issue: Port forwarding not working

**Symptoms:**
```
Cannot access localhost:4317 from host machine
```

**Solutions:**
```bash
# Verify port mappings in cluster config
kind get clusters
kind get kubeconfig --name obi-demo

# Check Docker port mappings
docker ps | grep obi-demo-control-plane

# Recreate cluster with correct port mappings
kind delete cluster --name obi-demo
kind create cluster --name obi-demo --config cluster-config.yaml

# Alternative: Use kubectl port-forward
kubectl port-forward -n observability svc/otel-collector 4317:4317
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

## Performance Considerations

### Resource Requirements

**Per OBI pod:**
- CPU: 100m-500m (varies with traffic)
- Memory: 128Mi-512Mi (varies with buffer size)
- Disk: Minimal (logs only)

**Cluster minimum:**
- 3GB RAM (for 3-node cluster)
- 2 CPU cores
- 20GB disk space

### Scaling Recommendations

**Small cluster (1-3 workers):**
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

**Large cluster (10+ workers):**
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi
```

## CI/CD Integration

kind is perfect for CI/CD pipelines:

### GitHub Actions Example

```yaml
name: OBI Integration Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create kind cluster
        uses: helm/kind-action@v1.8.0
        with:
          cluster_name: obi-test
          config: examples/kind/cluster-config.yaml

      - name: Deploy OBI
        run: |
          cd examples/kind
          ./deploy-obi.sh

      - name: Verify deployment
        run: |
          cd examples/kind
          ./verify.sh

      - name: Run tests
        run: |
          # Your test commands here
          kubectl logs -n observability -l app=obi
```

## Cost Considerations

kind is **free** and runs locally:

- **No cloud costs**: Everything runs on your machine
- **Low infrastructure costs**: Minimal resource usage
- **Fast iteration**: No cloud deployment delays
- **CI/CD friendly**: Free in GitHub Actions

**Resource cost estimate:**
- CPU: ~2 cores
- RAM: ~3GB
- Disk: ~20GB
- Time: ~3 minutes setup

## Next Steps

After deploying OBI on kind:

1. **Add sample applications** to generate telemetry
2. **Deploy OTLP collector** to receive and process data
3. **Add visualization** (Grafana, Jaeger, etc.)
4. **Test in CI/CD** pipeline
5. **Scale up** with more workers to test performance

## Additional Resources

- [kind Documentation](https://kind.sigs.k8s.io/)
- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [OTLP Protocol](https://opentelemetry.io/docs/specs/otlp/)
- [Kubernetes DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/raibid-labs/obi-mcp/issues)
- **kind Issues**: [kind bug reports](https://github.com/kubernetes-sigs/kind/issues)

---

**Ready to deploy?** Run `./setup.sh` to get started!
