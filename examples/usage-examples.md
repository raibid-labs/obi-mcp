# Usage Examples

This document shows how to interact with the OBI MCP Server through an AI assistant like Claude.

## Prerequisites

1. OBI MCP Server is running and configured in your MCP client
2. OBI binary is installed on your system
3. You have necessary permissions (root/sudo) for eBPF

## Example Conversations

### 1. Checking OBI Status

**User:**
```
Is OBI running on my system?
```

**AI Assistant (using obi_get_status):**
```
=== OBI Status ===
Status: stopped
```

**User:**
```
Check OBI status with detailed information
```

**AI Assistant (using obi_get_status with verbose=true):**
```
=== OBI Status ===
Status: running
PID: 45123
Uptime: 3600s

--- Details ---
CPU Usage: 2.34%
Memory Usage: 128.45 MB
Config Path: /home/user/.obi/obi-config.yml
```

### 2. Deploying OBI (Coming Soon - v0.1.0)

**User:**
```
Deploy OBI with default configuration
```

**AI Assistant (using obi_deploy_local):**
```
Deploying OBI in standalone mode...

✓ Config file created at: /home/user/.obi/obi-config.yml
✓ OBI started successfully with PID 45678
✓ Logs available at: /home/user/.obi/obi.log

OBI is now running and collecting telemetry!
```

### 3. Viewing Logs (Coming Soon - v0.1.0)

**User:**
```
Show me the last 50 lines of OBI logs
```

**AI Assistant (using obi_get_logs):**
```
=== OBI Logs (Last 50 Lines) ===

[2025-11-14 10:23:45] [INFO] OBI started successfully
[2025-11-14 10:23:46] [INFO] Network monitoring enabled
[2025-11-14 10:23:47] [INFO] Capturing flows on interface eth0
[2025-11-14 10:23:50] [INFO] network_flow: src=10.0.1.5 dst=10.0.1.10 proto=HTTP
...
```

### 4. Configuration Management (Coming Soon - v0.1.0)

**User:**
```
Update OBI config to enable Kubernetes metadata
```

**AI Assistant (using obi_update_config):**
```
Updating OBI configuration...

✓ Configuration updated successfully
✓ Kubernetes metadata collection enabled

Note: Restart OBI for changes to take effect.
Would you like me to restart it now?
```

**User:**
```
Yes, restart OBI
```

**AI Assistant:**
```
Restarting OBI...

✓ OBI stopped gracefully
✓ OBI started with new configuration (PID: 45890)

Configuration changes are now active!
```

### 5. Troubleshooting (Coming Soon - v0.2.0)

**User:**
```
OBI seems to have stopped working. Can you diagnose the issue?
```

**AI Assistant (using diagnose-obi-issues prompt):**
```
Running OBI diagnostics...

Checking status... ✗ OBI is not running
Checking logs... Found error: "Permission denied for eBPF"

Diagnosis:
The issue is likely related to insufficient permissions. OBI requires
root privileges or CAP_BPF capability to load eBPF programs.

Recommended fixes:
1. Run with sudo: sudo obi
2. Or grant capabilities: sudo setcap cap_bpf+ep /path/to/obi
3. Check kernel version: OBI requires Linux 5.8+

Would you like me to check your kernel version?
```

### 6. Network Flow Analysis (Coming Soon - v0.2.0)

**User:**
```
Analyze the network flows from the last 10 minutes
```

**AI Assistant (using analyze-network-flows prompt):**
```
=== Network Flow Analysis (Last 10 Minutes) ===

Total Flows: 1,247
Unique Sources: 15
Unique Destinations: 32

Top Protocols:
  - HTTP: 856 flows (68.6%)
  - gRPC: 312 flows (25.0%)
  - Redis: 79 flows (6.3%)

Top Source IPs:
  1. 10.0.1.5 → 423 flows (frontend-service)
  2. 10.0.1.10 → 298 flows (api-gateway)
  3. 10.0.1.15 → 186 flows (worker-pod)

Top Destination IPs:
  1. 10.0.2.20 → 521 flows (database)
  2. 10.0.2.25 → 334 flows (cache-redis)
  3. 10.0.2.30 → 187 flows (auth-service)

Insights:
- High traffic to database (10.0.2.20) - consider read replicas
- Redis traffic looks normal
- No anomalous patterns detected
```

## Advanced Use Cases

### Comparing Performance Before/After Changes

**User:**
```
I just deployed a new version. Compare network flows
before and after the deployment.
```

**AI Assistant:**
```
Comparing network flows...

Before Deployment (10:00-10:30):
- Avg latency: 45ms
- Error rate: 0.2%
- Total flows: 1,850

After Deployment (10:30-11:00):
- Avg latency: 38ms ↓ 15.6% improvement
- Error rate: 0.1% ↓ 50% improvement
- Total flows: 1,920 ↑ 3.8% increase

✓ Deployment appears successful!
  Performance improved across all metrics.
```

### Detecting Issues

**User:**
```
Are there any unusual patterns in the last hour?
```

**AI Assistant:**
```
Analyzing patterns...

⚠️  Anomaly Detected:

Unusual spike in errors from frontend-service (10.0.1.5)
to auth-service (10.0.2.30):

Normal error rate: 0.1%
Current error rate: 5.3% (53x increase)

Time: Started 15 minutes ago
Affected requests: 127 failed out of 2,392

Recommendation:
Check auth-service logs and health status. May be experiencing
degraded performance or connectivity issues.

Would you like me to investigate further?
```

## Tips for Best Results

### Be Specific

❌ **Vague:** "Check OBI"
✓ **Specific:** "Show me OBI status with CPU and memory usage"

### Use Natural Language

❌ **Command-like:** "obi_get_logs --lines=100"
✓ **Natural:** "Show me the last 100 lines from OBI logs"

### Context Matters

Provide context for better assistance:
- "I just deployed a new version, check if OBI detected any changes"
- "We're experiencing high latency, can OBI help identify the bottleneck?"
- "Set up OBI to monitor my Python microservices"

### Iterative Analysis

Break complex tasks into steps:
1. "Check if OBI is running"
2. "Show me recent logs"
3. "Analyze network flows from the last hour"
4. "Compare with previous hour"

## Coming Soon Features

These examples will work once the respective phases are completed:

- **Docker Deployment** (v0.3.0): "Deploy OBI as a Docker container"
- **Kubernetes Integration** (v0.3.0): "Deploy OBI to my k8s cluster"
- **Latency Analysis** (v0.3.0): "Show me p95 latency for my services"
- **Cost Estimation** (v1.0.0): "Estimate the cost of current telemetry volume"

---

For more examples and use cases, check the [documentation](../docs/) or join our community discussions!
