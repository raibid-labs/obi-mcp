# OBI MCP with K3D - Usage Examples

This guide provides comprehensive examples of using OBI MCP to monitor and analyze a k3d Kubernetes cluster.

## Table of Contents

1. [Basic Operations](#basic-operations)
2. [Configuration Management](#configuration-management)
3. [Log Analysis](#log-analysis)
4. [Network Flow Analysis](#network-flow-analysis)
5. [Troubleshooting](#troubleshooting)
6. [Advanced Scenarios](#advanced-scenarios)

---

## Basic Operations

### Check OBI Status

**Simple Status Check:**

Ask Claude:
```
Is OBI running?
```

**Expected Response:**
```
=== OBI Status ===
Status: running
PID: 12345
```

**Detailed Status Check:**

Ask Claude:
```
Check OBI status with detailed metrics
```

**Expected Response:**
```
=== OBI Status ===
Status: running
PID: 12345
Uptime: 1800s

--- Details ---
CPU Usage: 3.2%
Memory Usage: 245.67 MB
Config Path: /home/user/obi-k3d-config.yml
```

### Deploy OBI

**Deploy with Configuration File:**

Ask Claude:
```
Deploy OBI using the manifest at manifests/obi-daemonset.yaml
```

**Deploy with Inline Configuration:**

Ask Claude:
```
Deploy OBI with this configuration:
- Enable network monitoring
- Enable Kubernetes metadata
- Export to localhost:4317 using gRPC
- Monitor HTTP and gRPC protocols
```

**Expected Response:**
```
=== OBI Local Deployment ===

Status: SUCCESS
Message: OBI deployed successfully
PID: 45678
Config Path: /tmp/obi-config-xyz.yaml

OBI is now monitoring your k3d cluster!
```

### Stop OBI

**Graceful Stop:**

Ask Claude:
```
Stop OBI gracefully
```

**Force Stop:**

Ask Claude:
```
Force stop OBI immediately
```

---

## Configuration Management

### View Current Configuration

Ask Claude:
```
Show me the current OBI configuration
```

**Expected Response:**
```
=== OBI Configuration ===

{
  "network": {
    "enable": true,
    "allowed_attributes": [
      "k8s.src.namespace",
      "k8s.dst.namespace",
      "http.method",
      "http.status_code"
    ],
    "cidrs": [
      {
        "cidr": "10.42.0.0/16",
        "name": "k3d-pod-network"
      }
    ]
  },
  "attributes": {
    "kubernetes": {
      "enable": true
    }
  },
  "export": {
    "otlp": {
      "endpoint": "localhost:4317",
      "protocol": "grpc"
    }
  }
}
```

### Update Configuration

**Change OTLP Endpoint:**

Ask Claude:
```
Update the OBI configuration to use OTLP endpoint at 192.168.1.100:4317
```

**Enable Additional Attributes:**

Ask Claude:
```
Update OBI config to also capture these HTTP attributes:
- http.user_agent
- http.target
- http.host
```

**Update and Restart:**

Ask Claude:
```
Update the OTLP endpoint to localhost:4318 using HTTP protocol and restart OBI
```

**Expected Response:**
```
=== OBI Config Update ===

Status: Success
Message: Configuration updated successfully

OBI has been restarted with the new configuration.

--- Updated Configuration ---
{
  "export": {
    "otlp": {
      "endpoint": "localhost:4318",
      "protocol": "http/protobuf"
    }
  }
}
```

### Add Network CIDR

Ask Claude:
```
Add a new CIDR to the OBI config: 192.168.0.0/16 named 'external-network'
```

---

## Log Analysis

### View Recent Logs

**Last 50 Lines:**

Ask Claude:
```
Show me the last 50 lines of OBI logs
```

**Last 200 Lines:**

Ask Claude:
```
Get the last 200 log entries from OBI
```

**Expected Response:**
```
=== OBI Logs === [Last 50 lines]

[2025-11-18 10:23:45] [INFO] OBI started successfully
[2025-11-18 10:23:46] [INFO] Network monitoring enabled
[2025-11-18 10:23:47] [INFO] Kubernetes metadata collection enabled
[2025-11-18 10:23:50] [INFO] network_flow: src=10.42.0.5 dst=10.42.0.10 proto=HTTP method=GET status=200
[2025-11-18 10:23:51] [INFO] network_flow: k8s.src.namespace=demo-app k8s.src.pod=frontend-xyz
[2025-11-18 10:23:52] [INFO] network_flow: k8s.dst.service=backend-service proto=HTTP

--- End of Logs ---
```

### Filter Logs by Level

**Show Only Errors:**

Ask Claude:
```
Show me error logs from OBI
```

**Show Debug Logs:**

Ask Claude:
```
Get debug level logs from the last 100 entries
```

**Show Warnings:**

Ask Claude:
```
Show me warning logs from OBI
```

### Analyze Specific Patterns

Ask Claude:
```
Show me OBI logs that mention 'backend-service' from the last 5 minutes
```

Ask Claude:
```
Find logs related to HTTP 5xx errors
```

Ask Claude:
```
Show me logs containing 'connection refused' or 'timeout'
```

---

## Network Flow Analysis

### Identify Service Communication

Ask Claude:
```
Show me recent logs and identify which Kubernetes services are communicating
```

**Expected Response:**
```
Based on the recent OBI logs, here's the service communication map:

Frontend → Backend:
  - Namespace: demo-app
  - Protocol: HTTP
  - Method: GET
  - Success rate: 98.5%

Backend → Database:
  - Namespace: demo-app
  - Protocol: PostgreSQL
  - Queries: 450 in last minute

Backend → Cache:
  - Namespace: demo-app
  - Protocol: Redis
  - Commands: 120 in last minute

Load Generator → Frontend:
  - Continuous health checks every 2 seconds
  - All requests successful
```

### Analyze HTTP Traffic

Ask Claude:
```
Show me all HTTP traffic patterns from the last 10 minutes
```

Ask Claude:
```
What HTTP methods are being used most frequently?
```

Ask Claude:
```
Show me HTTP traffic with status codes 4xx or 5xx
```

### Monitor Specific Namespaces

Ask Claude:
```
Show me network flows in the 'demo-app' namespace
```

Ask Claude:
```
What services in the 'observability' namespace are receiving traffic?
```

### Detect Anomalies

Ask Claude:
```
Are there any unusual network patterns in the recent logs?
```

Ask Claude:
```
Show me connections to external IPs (outside cluster CIDRs)
```

---

## Troubleshooting

### Diagnose OBI Not Starting

Ask Claude:
```
OBI isn't starting. What could be wrong?
```

**Claude will check:**
1. OBI status
2. Recent error logs
3. Configuration validity
4. System requirements

**Example Diagnostic Response:**
```
Let me diagnose the OBI startup issue:

1. Checking OBI status... ✗ Not running
2. Checking recent logs...
   [ERROR] Failed to load eBPF program: Permission denied

Diagnosis:
The issue is insufficient permissions for eBPF operations.

Solutions:
1. Grant capabilities:
   sudo setcap cap_sys_admin,cap_sys_resource,cap_bpf,cap_perfmon+eip /usr/local/bin/obi

2. Or run with sudo:
   sudo obi --config /path/to/config.yml

3. Check kernel version (must be 5.8+):
   Current kernel: Run 'uname -r' to check
```

### No Metrics Appearing

Ask Claude:
```
OBI is running but I'm not seeing any metrics. Help me troubleshoot.
```

**Claude will check:**
1. OBI status and uptime
2. Configuration correctness
3. OTLP endpoint connectivity
4. Network activity in cluster

**Example Response:**
```
Let me troubleshoot the missing metrics:

1. OBI Status: ✓ Running (PID: 12345, Uptime: 300s)
2. Configuration: ✓ Valid
3. Checking logs for export errors...

Found issue:
[ERROR] Failed to export to OTLP endpoint localhost:4317: connection refused

Solution:
The OpenTelemetry Collector is not reachable. Check:

1. Verify collector is running:
   kubectl get pods -n observability

2. Verify port forwarding:
   kubectl port-forward -n observability svc/otel-collector 4317:4317

3. Update OBI config if collector endpoint changed
```

### High CPU/Memory Usage

Ask Claude:
```
OBI is using a lot of CPU/memory. How can I optimize it?
```

**Expected Response:**
```
Current OBI resource usage:
- CPU: 25.3%
- Memory: 892 MB

This is higher than normal. Recommendations:

1. Enable sampling to reduce overhead:
   Update config to sample 10% of traffic:
   sampling:
     rate: 0.1
     always_sample_errors: true

2. Reduce buffer size if in low-traffic environment:
   performance:
     buffer_size: 4096
     batch_size: 256

3. Filter to specific namespaces only:
   filters:
     namespaces:
       - demo-app
       - production

4. Increase export interval:
   performance:
     export_interval: 30

Would you like me to update the configuration with these optimizations?
```

### Connection Issues

Ask Claude:
```
I'm seeing connection timeout errors in OBI logs
```

Ask Claude:
```
OBI can't connect to the Kubernetes API server
```

---

## Advanced Scenarios

### Performance Testing

**Baseline Performance:**

Ask Claude:
```
Show me current network flow statistics to establish a baseline
```

**After Deploying Changes:**

Ask Claude:
```
Show me network flows again and compare with the earlier baseline
```

### Multi-Environment Monitoring

**Switch Between Clusters:**

Ask Claude:
```
Stop OBI, update the config to point to kubeconfig for prod cluster, then restart
```

### Custom Filtering

**Monitor Specific Services:**

Ask Claude:
```
Update OBI to only monitor pods in these namespaces: production, staging, and monitoring
```

**Filter by Protocol:**

Ask Claude:
```
Configure OBI to only capture HTTP and gRPC traffic, ignore Redis and PostgreSQL
```

### Export to Multiple Backends

Ask Claude:
```
Update OBI config to export metrics to both:
1. OTLP endpoint at localhost:4317
2. File at /tmp/obi-metrics.json for debugging
```

### Sampling Configuration

**Enable Smart Sampling:**

Ask Claude:
```
Update OBI to sample 5% of normal traffic but always capture all errors
```

### Resource Limits

**Set Resource Constraints:**

Ask Claude:
```
Update OBI configuration to limit:
- Maximum memory to 256MB
- Maximum CPU to 5%
```

### Scheduled Operations

**Restart During Off-Peak:**

Ask Claude:
```
Stop OBI now. I'll manually restart it during the maintenance window.
```

**Configuration Dry-Run:**

Ask Claude:
```
Show me what the configuration would look like if I enabled all available Kubernetes attributes, but don't apply it yet
```

---

## Real-World Scenarios

### Scenario 1: New Deployment Analysis

**Situation:** Just deployed a new version of your application.

**Workflow:**

1. **Before Deployment:**
```
Show me network flow baseline for the last 10 minutes
```

2. **After Deployment:**
```
Show me current network flows
```

3. **Compare:**
```
Are there any new error patterns or unusual traffic?
```

### Scenario 2: Debugging Microservice Communication

**Situation:** Frontend can't connect to backend intermittently.

**Workflow:**

1. **Check Current State:**
```
Show me all HTTP traffic between frontend and backend services
```

2. **Analyze Errors:**
```
Show me error-level logs mentioning frontend or backend
```

3. **Identify Issue:**
```
What HTTP status codes are being returned from backend?
```

### Scenario 3: Capacity Planning

**Situation:** Planning to scale your cluster.

**Workflow:**

1. **Current Metrics:**
```
Show me OBI's current resource usage
```

2. **Traffic Volume:**
```
How many network flows is OBI processing per minute?
```

3. **Optimization:**
```
What's the optimal configuration to reduce OBI overhead while maintaining visibility?
```

### Scenario 4: Security Audit

**Situation:** Need to audit external connections.

**Workflow:**

1. **Identify External Traffic:**
```
Show me all network flows to IPs outside the cluster CIDR ranges
```

2. **Analyze Destinations:**
```
What external endpoints are our services connecting to?
```

3. **Document:**
```
List all unique external destinations from the last hour
```

---

## Tips for Effective Usage

### Be Specific

❌ **Vague:** "Check logs"
✓ **Specific:** "Show me error logs from the last 100 lines"

### Provide Context

❌ **No context:** "Update config"
✓ **With context:** "Update the OTLP endpoint to localhost:4318 because I moved the collector to HTTP mode"

### Use Natural Language

❌ **Command-style:** "obi_get_logs --lines=50 --level=error"
✓ **Natural:** "Show me the last 50 error logs from OBI"

### Iterative Analysis

Break complex investigations into steps:

1. "Check OBI status"
2. "Show me recent logs"
3. "Are there any errors?"
4. "Show me flows for the demo-app namespace"
5. "What services are having communication issues?"

---

## Useful Queries Reference

### Status & Health
- "Is OBI running?"
- "Check OBI status with details"
- "What's OBI's current resource usage?"
- "How long has OBI been running?"

### Configuration
- "Show me the current config"
- "Update the OTLP endpoint to X"
- "Enable/disable Kubernetes metadata"
- "Add HTTP header attribute to config"

### Logs
- "Show me the last X lines of logs"
- "Get error logs"
- "Show debug logs"
- "Show logs mentioning 'keyword'"

### Analysis
- "Which services are communicating?"
- "Show me HTTP traffic patterns"
- "Are there any errors?"
- "What external IPs are being contacted?"

### Operations
- "Deploy OBI with [config]"
- "Stop OBI"
- "Restart OBI"
- "Update config and restart"

---

## Next Steps

For more advanced usage:
- [K3D Setup Guide](./K3D_SETUP_GUIDE.md) - Full setup documentation
- [OBI MCP README](~/raibid-labs/obi-mcp/README.md) - Complete tool reference
- [OpenTelemetry Docs](https://opentelemetry.io/docs/) - OTLP and observability

---

**Happy Monitoring!** 🎯
