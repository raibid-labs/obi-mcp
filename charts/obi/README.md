# OBI Helm Chart

OpenTelemetry eBPF Instrumentation (OBI) Helm chart for Kubernetes deployment.

## Overview

This Helm chart deploys OBI as a DaemonSet on Kubernetes clusters, enabling automatic instrumentation of applications using eBPF technology.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Nodes with kernel version 4.14+ (for eBPF support)
- Privileged container support (for eBPF operations)

## Installation

### Install from OCI Registry

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace
```

### Install from Local Chart

```bash
helm install obi ./charts/obi \
  --namespace observability \
  --create-namespace
```

### Install with Custom Values

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace \
  --set obi.otlpEndpoint="http://my-collector:4317" \
  --set obi.openPort=8080
```

## Configuration

The following table lists the configurable parameters of the OBI chart and their default values.

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | OBI container image repository | `otel/ebpf-instrument` |
| `image.tag` | OBI container image tag | `main` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `imagePullSecrets` | Image pull secrets | `[]` |

### OBI Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `obi.otlpEndpoint` | OpenTelemetry collector endpoint | `http://otel-collector:4317` |
| `obi.openPort` | Port to instrument | `8080` |
| `obi.networkEnabled` | Enable network instrumentation | `true` |
| `obi.serviceName` | Service name for telemetry | `""` |
| `obi.allowedAttributes` | List of allowed attributes | See values.yaml |
| `obi.extraEnv` | Additional environment variables | `[]` |

### Resource Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `securityContext.privileged` | Run as privileged container | `true` |
| `securityContext.capabilities.add` | Linux capabilities to add | `[SYS_ADMIN, SYS_PTRACE, NET_ADMIN]` |

### DaemonSet Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `daemonset.updateStrategy.type` | Update strategy type | `RollingUpdate` |
| `daemonset.updateStrategy.rollingUpdate.maxUnavailable` | Max unavailable during update | `1` |
| `daemonset.annotations` | Annotations for DaemonSet | `{}` |
| `daemonset.labels` | Labels for DaemonSet | `{}` |
| `daemonset.podAnnotations` | Annotations for pods | `{}` |
| `daemonset.podLabels` | Labels for pods | `{}` |

### RBAC Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `serviceAccount.create` | Create service account | `true` |
| `serviceAccount.name` | Service account name | `""` (generated) |
| `serviceAccount.annotations` | Service account annotations | `{}` |
| `rbac.create` | Create RBAC resources | `true` |

### Scheduling Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `nodeSelector` | Node selector for pod assignment | `{}` |
| `tolerations` | Tolerations for pod assignment | See values.yaml |
| `affinity` | Affinity rules for pod assignment | `{}` |
| `priorityClassName` | Priority class name | `""` |

### Host Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `hostNetwork` | Use host network | `true` |
| `hostPID` | Use host PID namespace | `true` |
| `dnsPolicy` | DNS policy | `ClusterFirstWithHostNet` |

## Examples

### Basic Installation

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace
```

### Custom OTLP Endpoint

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace \
  --set obi.otlpEndpoint="http://jaeger-collector:4317"
```

### Multiple Ports

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace \
  --set obi.openPort=8080
```

### Custom Resource Limits

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace \
  --set resources.limits.memory=1Gi \
  --set resources.limits.cpu=1000m
```

### Node Selector

```bash
helm install obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --create-namespace \
  --set nodeSelector."kubernetes\.io/arch"=amd64
```

## Upgrading

```bash
helm upgrade obi oci://ghcr.io/raibid-labs/charts/obi \
  --namespace observability \
  --reuse-values
```

## Uninstalling

```bash
helm uninstall obi --namespace observability
```

## Verification

After installation, verify the deployment:

```bash
# Check DaemonSet
kubectl get daemonset -n observability obi

# Check pods
kubectl get pods -n observability -l app.kubernetes.io/name=obi

# View logs
kubectl logs -n observability -l app.kubernetes.io/name=obi --tail=100
```

## Testing

Run Helm tests:

```bash
helm test obi --namespace observability
```

## Troubleshooting

### Pods not starting

Check if nodes support eBPF:
```bash
kubectl get nodes -o wide
uname -r  # Kernel should be 4.14+
```

### Permission denied errors

Ensure privileged containers are allowed in your cluster security policies.

### OTLP connection issues

Verify the collector endpoint is accessible:
```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://otel-collector:4317
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/raibid-labs/obi-mcp/issues
- Documentation: https://github.com/raibid-labs/obi-mcp/tree/main/docs

## License

MIT License - see LICENSE file for details
