# Quick Start: OBI MCP with K3D

Get up and running with OBI metrics collection from a K3D cluster in under 10 minutes.

## Prerequisites

- Linux system with kernel 5.8+ (check with `uname -r`)
- Docker installed and running
- 8GB RAM available
- Sudo/root access

## Step-by-Step Setup

### 1. Install K3D (2 minutes)

```bash
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
k3d version
```

### 2. Create K3D Cluster (1 minute)

```bash
k3d cluster create obi-demo \
  --agents 2 \
  --port "4317:4317@server:0" \
  --k3s-arg "--disable=traefik@server:0"

kubectl get nodes
```

### 3. Install OBI Binary (2 minutes)

```bash
# Download OBI (replace with actual URL when available)
sudo wget https://github.com/open-telemetry/opentelemetry-ebpf/releases/latest/download/obi-linux-amd64 \
  -O /usr/local/bin/obi

sudo chmod +x /usr/local/bin/obi

# Grant capabilities
sudo setcap cap_sys_admin,cap_sys_resource,cap_bpf,cap_perfmon+eip /usr/local/bin/obi

# Verify
obi --version
```

### 4. Setup OBI MCP Server (2 minutes)

```bash
# Install and build
cd ~/raibid-labs/obi-mcp
npm install
npm run build

# Configure Claude Desktop
# Edit: ~/.config/Claude/claude_desktop_config.json
```

Add this configuration:

```json
{
  "mcpServers": {
    "obi": {
      "command": "node",
      "args": ["/home/beengud/raibid-labs/obi-mcp/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Restart Claude Desktop**

### 5. Deploy OpenTelemetry Collector (1 minute)

```bash
cd ~/raibid-labs/obi-mcp/examples/k3d
kubectl apply -f manifests/otel-collector.yaml

# Verify
kubectl get pods -n observability
```

### 6. Deploy Sample Application (1 minute)

```bash
kubectl apply -f manifests/sample-app.yaml

# Verify
kubectl get pods -n demo-app
```

### 7. Deploy OBI via Claude

Open Claude Desktop and ask:

```
Deploy OBI using the manifest at manifests/obi-daemonset.yaml
```

### 8. Verify Everything is Working

Ask Claude:

```
Check OBI status with detailed metrics
```

You should see:
- Status: running
- PID: [some number]
- CPU and Memory usage

```
Show me the last 50 lines of OBI logs
```

You should see network flow events from your k3d cluster.

## What's Running?

After setup, you have:

1. **K3D Cluster** with 2 agent nodes
2. **OpenTelemetry Collector** receiving metrics on port 4317
3. **Sample Application** generating observable traffic:
   - Frontend (nginx)
   - Backend API
   - PostgreSQL database
   - Redis cache
   - Load generator
4. **OBI** collecting network metrics and Kubernetes metadata
5. **OBI MCP Server** providing AI-powered management via Claude

## Next Steps

### Explore Metrics

Ask Claude:

```
Show me recent OBI logs and identify which services are communicating
```

```
Get the current OBI configuration
```

### Modify Configuration

```
Update OBI configuration to increase the export interval to 30 seconds and restart OBI
```

### Analyze Traffic

```
Show me logs from the last 5 minutes filtered by HTTP traffic
```

### Stop and Clean Up

```bash
# Stop OBI via Claude
"Stop OBI"

# Delete k3d cluster
k3d cluster delete obi-demo

# Remove sample apps
kubectl delete -f manifests/sample-app.yaml
kubectl delete -f manifests/otel-collector.yaml
```

## Troubleshooting

### OBI won't start

```bash
# Check kernel version
uname -r  # Must be 5.8+

# Verify capabilities
getcap /usr/local/bin/obi
```

### No metrics appearing

Ask Claude:
```
Show me OBI error logs
```

Check collector is running:
```bash
kubectl get pods -n observability
kubectl logs -n observability -l app=otel-collector
```

### Claude doesn't see OBI tools

```bash
# Verify build
ls -la ~/raibid-labs/obi-mcp/dist/index.js

# Check config
cat ~/.config/Claude/claude_desktop_config.json

# Restart Claude Desktop completely
```

## Full Documentation

For comprehensive setup and advanced features, see:
- [K3D_SETUP_GUIDE.md](./K3D_SETUP_GUIDE.md) - Complete setup guide
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - Comprehensive examples
- [obi-mcp README](~/raibid-labs/obi-mcp/README.md) - OBI MCP Server docs

## Support

- [OBI MCP Issues](https://github.com/raibid-labs/obi-mcp/issues)
- [K3D Documentation](https://k3d.io/)
- [OpenTelemetry Community](https://opentelemetry.io/community/)
