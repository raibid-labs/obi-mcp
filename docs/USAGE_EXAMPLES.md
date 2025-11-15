# OBI MCP Server - Usage Examples

Practical examples of using the OBI MCP Server with Claude Desktop and other MCP clients.

## Table of Contents

- [Basic Operations](#basic-operations)
- [Configuration Management](#configuration-management)
- [Monitoring and Observability](#monitoring-and-observability)
- [Advanced Workflows](#advanced-workflows)
- [Troubleshooting Scenarios](#troubleshooting-scenarios)
- [Integration Examples](#integration-examples)

---

## Basic Operations

### Deploy OBI

#### Simple Deployment
```
You: "Deploy OBI with default settings"

Claude: I'll deploy OBI with the default configuration.
[Uses obi_deploy_local tool]

=== OBI Deployment ===
Status: SUCCESS
PID: 52341
Config Path: /Users/you/.obi/obi-config.yml
Log Path: /Users/you/.obi/obi.log

OBI has been deployed successfully and is now running!
```

#### Deploy with Custom Binary Path
```
You: "Deploy OBI using the binary at /opt/obi/bin/obi"

Claude: [Uses obi_deploy_local with binaryPath parameter]
```

### Check Status

#### Basic Status
```
You: "Is OBI running?"

Claude: [Uses obi_get_status]

=== OBI Status ===
Status: running
PID: 52341
Uptime: 125s
```

#### Detailed Status
```
You: "Give me detailed OBI metrics"

Claude: [Uses obi_get_status with verbose=true]

=== OBI Status ===
Status: running
PID: 52341
Uptime: 125s

--- Details ---
CPU Usage: 2.34%
Memory Usage: 142.18 MB
Config Path: /Users/you/.obi/obi-config.yml
```

### Stop OBI

#### Graceful Stop
```
You: "Stop the OBI process gracefully"

Claude: [Uses obi_stop]

=== OBI Stop ===
OBI process stopped successfully (PID 52341)
```

#### Force Stop
```
You: "Force stop OBI immediately"

Claude: [Uses obi_stop with force=true]

=== OBI Stop ===
OBI process forcefully terminated (PID 52341)
```

---

## Configuration Management

### View Configuration

```
You: "What's the current OBI configuration?"

Claude: [Uses obi_get_config]

{
  "network": {
    "enable": true,
    "allowed_attributes": ["http.method", "http.url", "http.status_code"]
  },
  "export": {
    "otlp": {
      "endpoint": "http://localhost:4317",
      "protocol": "grpc"
    }
  }
}
```

### Update Configuration (Merge Mode)

```
You: "Add Kubernetes attribute collection to the OBI config"

Claude: I'll update the configuration to enable Kubernetes attributes.
[Uses obi_update_config with merge=true]

Configuration updated successfully!
Restart OBI for changes to take effect.

Would you like me to restart OBI now?

You: "Yes, restart it"

Claude: [Uses obi_stop then obi_deploy_local]

OBI has been restarted with the updated configuration.
```

### Replace Configuration

```
You: "Replace the OBI config with a minimal setup that only captures network metrics"

Claude: [Uses obi_update_config with merge=false]

{
  "network": {
    "enable": true
  }
}

Configuration replaced successfully.
Note: This replaces the entire config. Restart required.
```

### Update and Auto-Restart

```
You: "Change the OTLP endpoint to http://collector:4318 and automatically restart OBI"

Claude: [Uses obi_update_config with restart=true]

Configuration updated and OBI restarted successfully!

New OTLP endpoint: http://collector:4318
OBI PID: 53892
```

---

## Monitoring and Observability

### Log Analysis

#### Get Recent Logs
```
You: "Show me the last 100 lines from OBI logs"

Claude: [Uses obi_get_logs with lines=100]

=== OBI Logs (last 100 lines) ===
2025-11-14T10:23:45Z [info] Starting OBI...
2025-11-14T10:23:45Z [info] eBPF programs loaded successfully
2025-11-14T10:23:46Z [info] Network monitoring enabled
2025-11-14T10:23:47Z [info] Captured HTTP request: GET /api/users
...
```

#### Filter by Log Level
```
You: "Show me only error messages from OBI"

Claude: [Uses obi_get_logs with level='error']

=== OBI Logs (errors only) ===
2025-11-14T10:25:12Z [error] Failed to connect to OTLP endpoint
2025-11-14T10:28:34Z [error] Rate limit exceeded for metric export
```

```
You: "Get warning and info messages from the last 50 lines"

Claude: Note: The filter supports one level at a time.
Would you like 'warn' or 'info' level logs?

You: "warnings"

Claude: [Uses obi_get_logs with lines=50, level='warn']
```

### Using Resources for Real-Time Data

#### Health Monitoring
```
You: "What's in the obi://status/health resource?"

Claude: [Reads obi://status/health resource]

{
  "status": "running",
  "pid": 52341,
  "uptime": 3650,
  "cpuUsage": 2.1,
  "memoryUsage": 145.67,
  "timestamp": "2025-11-14T11:15:22Z"
}

The health metrics show OBI is healthy:
- Running for ~1 hour
- CPU usage is low (2.1%)
- Memory usage is stable (~146 MB)
```

#### Live Configuration Access
```
You: "Check the current config using the resource endpoint"

Claude: [Reads obi://config/current]

Here's the live configuration from obi://config/current:
{
  "network": {
    "enable": true,
    "allowed_attributes": ["http.method", "http.url"]
  }
}
```

---

## Advanced Workflows

### Complete Deployment Workflow

```
You: "I want to deploy OBI, configure it for Kubernetes monitoring, verify it's working, and show me some logs"

Claude: I'll help you with a complete OBI deployment and configuration.

Step 1: Deploying OBI...
[Uses obi_deploy_local]
✓ OBI deployed (PID: 54123)

Step 2: Updating configuration for Kubernetes monitoring...
[Uses obi_update_config]
✓ Configuration updated

Step 3: Restarting OBI...
[Uses obi_stop then obi_deploy_local]
✓ OBI restarted (PID: 54234)

Step 4: Verifying deployment...
[Uses obi_get_status with verbose=true]
✓ OBI is running healthy
  CPU: 2.8%, Memory: 158 MB

Step 5: Checking recent logs...
[Uses obi_get_logs with lines=20]
✓ Recent logs show successful Kubernetes integration

Your OBI setup is complete and monitoring Kubernetes!
```

### Configuration Comparison

```
You: "Show me the config before and after I enable OTLP export"

Claude: Current configuration:
[Uses obi_get_config]
{
  "network": { "enable": true }
}

Now I'll add OTLP export...
[Uses obi_update_config]

Updated configuration:
{
  "network": { "enable": true },
  "export": {
    "otlp": {
      "endpoint": "http://localhost:4317",
      "protocol": "grpc"
    }
  }
}

Changes made:
+ Added OTLP export configuration
+ Endpoint: http://localhost:4317
+ Protocol: gRPC
```

### Health Check Automation

```
You: "Create a health check routine: check status, show resource metrics, and display any errors in logs"

Claude: Running comprehensive health check...

1. Process Status:
[Uses obi_get_status with verbose=true]
✓ Running (PID: 52341, Uptime: 2h 15m)
✓ CPU: 1.9%, Memory: 142 MB

2. Real-Time Metrics:
[Reads obi://status/health]
✓ Timestamp: 2025-11-14T13:30:45Z
✓ All metrics within normal range

3. Error Log Scan:
[Uses obi_get_logs with level='error', lines=50]
✓ No recent errors found

Health Status: HEALTHY ✓
```

---

## Troubleshooting Scenarios

### OBI Won't Start

```
You: "OBI won't start - help me debug"

Claude: Let me help diagnose the issue.

Step 1: Checking current status...
[Uses obi_get_status]
Status: stopped

Step 2: Looking for errors in logs...
[Uses obi_get_logs with level='error']

Found error: "Permission denied: eBPF requires root access"

This is the issue! OBI needs elevated permissions for eBPF.

Solutions:
1. Run OBI with sudo (manual deployment)
2. Use Docker deployment (coming in v0.2.0)
3. Grant CAP_BPF capability to the binary

Would you like me to help with any of these options?
```

### Performance Investigation

```
You: "OBI seems to be using a lot of CPU - investigate"

Claude: Let me check OBI's performance...

Current metrics:
[Uses obi_get_status with verbose=true]
CPU Usage: 15.7% ⚠️  (Higher than normal)
Memory Usage: 245 MB ⚠️  (Increased from baseline)

Checking logs for clues...
[Uses obi_get_logs with lines=100]

Found pattern: High CPU correlates with frequent metric exports

Recommendations:
1. Increase export interval in config
2. Reduce number of tracked attributes
3. Consider sampling for high-volume workloads

Would you like me to adjust the configuration?
```

### Configuration Recovery

```
You: "I think I broke the OBI config - how do I recover?"

Claude: Don't worry, let's check and fix it.

Step 1: Checking current config...
[Uses obi_get_config]
Error: Invalid configuration format

Step 2: I'll reset to a minimal working config...
[Uses obi_update_config with merge=false]

{
  "network": {
    "enable": true
  }
}

Step 3: Restarting OBI...
[Uses obi_stop then obi_deploy_local]

✓ OBI is now running with minimal configuration
✓ PID: 55678

Your config has been recovered. You can now incrementally add features back.
```

---

## Integration Examples

### With Prometheus

```
You: "Configure OBI to export metrics to Prometheus at localhost:9090"

Claude: [Uses obi_update_config]

{
  "export": {
    "prometheus": {
      "endpoint": "http://localhost:9090",
      "scrape_interval": "30s"
    }
  }
}

✓ Prometheus export configured
Restart required: Yes

Would you like me to restart OBI now?
```

### With Grafana Cloud

```
You: "Set up OBI to send telemetry to Grafana Cloud at https://metrics.grafana.net with API key"

Claude: [Uses obi_update_config with OTLP configuration]

I'll configure OBI for Grafana Cloud. For security, please provide:
1. Your Grafana Cloud endpoint
2. API key (I won't log this)

[After receiving details]

✓ Configuration updated with Grafana Cloud settings
✓ Using OTLP/HTTP protocol
✓ Authentication configured

Restarting OBI...
✓ OBI is now sending metrics to Grafana Cloud
```

### With Kubernetes

```
You: "Configure OBI to collect Kubernetes metadata"

Claude: [Uses obi_update_config]

{
  "attributes": {
    "kubernetes": {
      "enable": true
    }
  }
}

✓ Kubernetes attribute collection enabled

This will add pod name, namespace, labels, and other K8s metadata
to your telemetry.

Restart OBI to apply changes?
```

---

## Best Practices

### Regular Health Checks

```
You: "Set up a monitoring routine I can ask you to run daily"

Claude: I'll create a daily health check routine for you.

When you say "Run daily OBI health check", I'll:

1. ✓ Verify OBI is running
2. ✓ Check resource usage (CPU/Memory)
3. ✓ Scan for errors in last 24h
4. ✓ Confirm config hasn't changed unexpectedly
5. ✓ Verify OTLP export is working

Just ask me to "Run daily OBI health check" anytime!
```

### Safe Configuration Updates

```
You: "What's the safest way to update OBI config?"

Claude: Here's the recommended approach:

1. First, backup current config:
   [Uses obi_get_config]
   [Saves to memory for rollback]

2. Make your changes in merge mode:
   [Uses obi_update_config with merge=true]

3. Verify the updated config:
   [Uses obi_get_config]

4. Test with restart:
   [Uses obi_stop then obi_deploy_local]

5. Monitor for issues:
   [Uses obi_get_status and obi_get_logs]

If something goes wrong, I can rollback to the saved config.
```

---

## Quick Command Reference

| Task | Example Prompt |
|------|----------------|
| Deploy | "Deploy OBI with default config" |
| Status Check | "What's OBI status with details?" |
| View Config | "Show current OBI configuration" |
| Update Config | "Add Kubernetes monitoring to OBI" |
| Get Logs | "Show last 100 OBI log lines" |
| Filter Logs | "Show only error logs" |
| Stop OBI | "Stop OBI process" |
| Health Check | "Is OBI healthy? Check all metrics" |
| Resource Access | "What's in obi://status/health?" |
| Guided Setup | "Help me set up OBI" |

---

For more examples and detailed documentation, see:
- [Quick Start Guide](./QUICKSTART.md)
- [API Reference](./API.md)
- [Architecture](./ARCHITECTURE.md)
