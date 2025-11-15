# API Reference

Complete reference for all MCP tools, resources, and prompts provided by the OBI MCP Server.

## Table of Contents

- [Tools](#tools)
  - [obi_get_status](#obi_get_status)
  - [obi_deploy_local](#obi_deploy_local)
  - [obi_get_config](#obi_get_config)
  - [obi_update_config](#obi_update_config)
  - [obi_get_logs](#obi_get_logs)
  - [obi_stop](#obi_stop)
- [Resources](#resources)
  - [obi://config/current](#obiconfigurecurrent)
  - [obi://status/health](#obistatushealth)
  - [obi://logs/recent](#obilogsrecent)
- [Prompts](#prompts)
  - [setup-obi-local](#setup-obi-local)

---

## Tools

### obi_get_status

Get the current status of the OpenTelemetry eBPF Instrumentation (OBI) process.

#### Description

Returns information about whether OBI is running, its PID, resource usage, and health. This tool provides both basic status information and detailed metrics when requested.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "verbose": {
      "type": "boolean",
      "description": "Include detailed process information (CPU, memory, uptime)",
      "default": false
    }
  }
}
```

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `verbose` | boolean | No | `false` | Include detailed process metrics (CPU usage, memory usage, uptime) |

#### Returns

**Content Type**: `text/plain`

**Basic Response** (verbose=false):
```
=== OBI Status ===
Status: running
PID: 12345
Uptime: 3600s
```

**Verbose Response** (verbose=true):
```
=== OBI Status ===
Status: running
PID: 12345
Uptime: 3600s

--- Details ---
CPU Usage: 2.5%
Memory Usage: 150.32 MB
Config Path: /etc/obi/config.yaml
```

**Status Values**:
- `running`: OBI process is active
- `stopped`: OBI process is not running
- `unknown`: Unable to determine status

#### Error Responses

```
Error: Unable to determine OBI status
Error: Process information unavailable
```

#### Example Usage

**Basic Status Check**:
```
User: "What's the status of OBI?"
AI: [Calls obi_get_status with verbose=false]
```

**Detailed Status Check**:
```
User: "Show me detailed OBI metrics"
AI: [Calls obi_get_status with verbose=true]
```

---

### obi_deploy_local

Deploy the OpenTelemetry eBPF Instrumentation (OBI) locally in standalone mode.

#### Description

Starts the OBI process with the specified configuration. You can provide either a configuration object directly or a path to a configuration file. The tool handles process spawning, validation, and initialization.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "config": {
      "type": "object",
      "description": "OBI configuration object (optional if configPath is provided)"
    },
    "configPath": {
      "type": "string",
      "description": "Path to OBI configuration file (optional if config is provided)"
    },
    "binaryPath": {
      "type": "string",
      "description": "Path to OBI binary (optional, uses PATH if not provided)"
    }
  }
}
```

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | object | No* | - | OBI configuration object with network, export, and attributes settings |
| `configPath` | string | No* | - | Absolute path to YAML configuration file |
| `binaryPath` | string | No | `obi` | Path to OBI binary executable |

*At least one of `config` or `configPath` must be provided.

#### Configuration Object Schema

```typescript
{
  network?: {
    enable?: boolean;
    allowed_attributes?: string[];
    cidrs?: Array<{
      cidr: string;
      name: string;
    }>;
  };
  attributes?: {
    kubernetes?: {
      enable?: boolean;
    };
  };
  export?: {
    otlp?: {
      endpoint?: string;
      protocol?: 'grpc' | 'http/protobuf';
    };
  };
}
```

#### Returns

**Content Type**: `text/plain`

**Success Response**:
```
=== OBI Local Deployment ===

Status: SUCCESS
Message: OBI deployed successfully
PID: 12345
Config Path: /tmp/obi-config.yaml
```

**Failure Response**:
```
=== OBI Local Deployment ===

Status: FAILED
Message: Failed to start OBI process

Error Details: Binary not found at specified path
```

#### Error Responses

```
Error: Configuration validation failed
Error: OBI binary not found
Error: Permission denied (requires sudo)
Error: Port already in use
```

#### Example Usage

**Deploy with Config Object**:
```
User: "Deploy OBI with OTLP endpoint at localhost:4317"
AI: [Calls obi_deploy_local with config object]
```

**Deploy with Config File**:
```
User: "Start OBI using /etc/obi/config.yaml"
AI: [Calls obi_deploy_local with configPath]
```

**Deploy with Custom Binary**:
```
User: "Deploy OBI using the binary at /opt/obi/bin/obi"
AI: [Calls obi_deploy_local with binaryPath]
```

---

### obi_get_config

Retrieve the current OpenTelemetry eBPF Instrumentation (OBI) configuration.

#### Description

Returns the active configuration including network settings, attributes, and export endpoints. The configuration is returned in JSON format for easy parsing and analysis.

#### Input Schema

```json
{
  "type": "object",
  "properties": {}
}
```

#### Arguments

No arguments required.

#### Returns

**Content Type**: `text/plain` (formatted JSON)

**Success Response**:
```
=== OBI Configuration ===

{
  "network": {
    "enable": true,
    "allowed_attributes": [
      "http.method",
      "http.status_code",
      "http.url"
    ],
    "cidrs": [
      {
        "cidr": "10.0.0.0/8",
        "name": "internal"
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

**No Config Response**:
```
No OBI configuration available. OBI has not been deployed yet or config file is missing.
```

#### Error Responses

```
Error: Unable to read configuration file
Error: Configuration file is corrupted
```

#### Example Usage

```
User: "Show me the current OBI configuration"
AI: [Calls obi_get_config]
```

```
User: "What's the OTLP endpoint configured for OBI?"
AI: [Calls obi_get_config and extracts endpoint information]
```

---

### obi_update_config

Update the OpenTelemetry eBPF Instrumentation (OBI) configuration.

#### Description

Updates OBI configuration with validation. Supports merging with existing configuration or complete replacement. Can optionally restart OBI to apply changes immediately.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "config": {
      "type": "object",
      "description": "New configuration object (or partial config if merge=true)",
      "properties": {
        "network": {
          "type": "object",
          "properties": {
            "enable": { "type": "boolean" },
            "allowed_attributes": {
              "type": "array",
              "items": { "type": "string" }
            },
            "cidrs": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "cidr": { "type": "string" },
                  "name": { "type": "string" }
                }
              }
            }
          }
        },
        "attributes": {
          "type": "object",
          "properties": {
            "kubernetes": {
              "type": "object",
              "properties": {
                "enable": { "type": "boolean" }
              }
            }
          }
        },
        "export": {
          "type": "object",
          "properties": {
            "otlp": {
              "type": "object",
              "properties": {
                "endpoint": { "type": "string" },
                "protocol": {
                  "type": "string",
                  "enum": ["grpc", "http/protobuf"]
                }
              }
            }
          }
        }
      }
    },
    "merge": {
      "type": "boolean",
      "description": "If true, merge with existing config; if false, replace entirely",
      "default": true
    },
    "restart": {
      "type": "boolean",
      "description": "If true, restart OBI after updating config to apply changes",
      "default": false
    }
  },
  "required": ["config"]
}
```

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | object | Yes | - | New configuration object (partial if merge=true, complete if merge=false) |
| `merge` | boolean | No | `true` | Merge with existing configuration instead of replacing |
| `restart` | boolean | No | `false` | Restart OBI process after update to apply changes |

#### Returns

**Content Type**: `text/plain`

**Success Response (with restart)**:
```
=== OBI Config Update ===

Status: Success
Message: Configuration updated successfully

OBI has been restarted with the new configuration.

--- Updated Configuration ---
{
  "network": { ... },
  "export": { ... }
}
```

**Success Response (without restart)**:
```
=== OBI Config Update ===

Status: Success
Message: Configuration updated successfully

Note: Restart OBI for changes to take effect.

--- Updated Configuration ---
{...}
```

#### Error Responses

```
Error: Invalid configuration structure
Error: Validation failed for field 'export.otlp.endpoint'
Error: Unable to write configuration file
Error: Failed to restart OBI process
```

#### Example Usage

**Update Endpoint**:
```
User: "Change the OTLP endpoint to localhost:4318"
AI: [Calls obi_update_config with partial config, merge=true]
```

**Enable Feature with Restart**:
```
User: "Enable Kubernetes attributes and restart OBI"
AI: [Calls obi_update_config with config, restart=true]
```

**Complete Config Replacement**:
```
User: "Replace the entire configuration with this new config"
AI: [Calls obi_update_config with complete config, merge=false]
```

---

### obi_get_logs

Retrieve recent logs from the OpenTelemetry eBPF Instrumentation (OBI) process.

#### Description

Returns log entries with optional filtering by log level. Useful for debugging, monitoring, and troubleshooting OBI operations.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "lines": {
      "type": "number",
      "description": "Number of recent log lines to retrieve",
      "default": 100,
      "minimum": 1,
      "maximum": 10000
    },
    "level": {
      "type": "string",
      "description": "Filter logs by level (info, warn, error, debug, or all for no filtering)",
      "enum": ["info", "warn", "error", "debug", "all"]
    }
  }
}
```

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `lines` | number | No | `100` | Number of recent log lines to retrieve (1-10000) |
| `level` | string | No | - | Filter by log level: `info`, `warn`, `error`, `debug`, or `all` |

#### Returns

**Content Type**: `text/plain`

**All Logs Response**:
```
=== OBI Logs === [Last 100 lines]

[2025-11-14 10:23:45] [INFO] OBI started successfully
[2025-11-14 10:23:46] [INFO] Loading eBPF programs
[2025-11-14 10:23:47] [INFO] Attached to process: nginx (PID: 1234)
[2025-11-14 10:23:48] [WARN] High memory usage detected
[2025-11-14 10:23:49] [INFO] Exporting traces to localhost:4317

--- End of Logs ---
```

**Filtered Response**:
```
=== OBI Logs === [Level: ERROR] [Last 3 lines]

[2025-11-14 10:23:45] [ERROR] Failed to connect to OTLP endpoint
[2025-11-14 10:23:46] [ERROR] Retrying connection...
[2025-11-14 10:24:00] [ERROR] Connection timeout

--- End of Logs ---
```

**No Logs Response**:
```
=== OBI Logs === [Last 0 lines]

No logs available
(No logs found matching level: error)

--- End of Logs ---
```

#### Error Responses

```
Error: Log file not accessible
Error: Invalid log level specified
```

#### Example Usage

**Recent Logs**:
```
User: "Show me the last 50 lines of OBI logs"
AI: [Calls obi_get_logs with lines=50]
```

**Error Logs Only**:
```
User: "Are there any errors in the OBI logs?"
AI: [Calls obi_get_logs with level='error']
```

**Debug Logs**:
```
User: "Show me debug logs for troubleshooting"
AI: [Calls obi_get_logs with level='debug', lines=200]
```

---

### obi_stop

Stop the running OpenTelemetry eBPF Instrumentation (OBI) process.

#### Description

Gracefully terminates the OBI process using SIGTERM, with SIGKILL as fallback. Use `force=true` to immediately send SIGKILL instead of graceful shutdown.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "force": {
      "type": "boolean",
      "description": "Force immediate termination using SIGKILL instead of graceful SIGTERM",
      "default": false
    }
  }
}
```

#### Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `force` | boolean | No | `false` | Use SIGKILL for immediate termination instead of graceful SIGTERM |

#### Returns

**Content Type**: `text/plain`

**Success Response**:
```
=== OBI Stop ===

Status: Success
Message: OBI process stopped successfully

The OBI process has been stopped successfully.
```

**Not Running Response**:
```
=== OBI Stop ===

Status: Not Running
Message: OBI is not currently running

The OBI process is not currently running. Nothing to stop.
```

**Failure Response**:
```
=== OBI Stop ===

Status: Failed
Message: Failed to stop OBI process

Error: Process did not respond to termination signal
```

#### Error Responses

```
Error: Permission denied (requires sudo)
Error: Timeout waiting for process to stop
```

#### Example Usage

**Graceful Stop**:
```
User: "Stop OBI"
AI: [Calls obi_stop with force=false]
```

**Force Stop**:
```
User: "Force kill the OBI process immediately"
AI: [Calls obi_stop with force=true]
```

---

## Resources

MCP resources provide read-only access to OBI state and configuration. Resources are accessed via URI and return structured data.

### obi://config/current

**Name**: Current OBI Configuration
**MIME Type**: `application/json`

#### Description

Provides real-time access to the current OBI configuration. Returns the same data as `obi_get_config` but as a resource that can be monitored or subscribed to.

#### URI

```
obi://config/current
```

#### Returns

```json
{
  "network": {
    "enable": true,
    "allowed_attributes": ["http.method", "http.status_code"]
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

#### No Configuration Available

```json
{
  "error": "No configuration available",
  "message": "OBI has not been deployed yet or config path is not set"
}
```

---

### obi://status/health

**Name**: OBI Process Health
**MIME Type**: `application/json`

#### Description

Current health status and metrics of the OBI process. Provides detailed information about process state, resource usage, and uptime.

#### URI

```
obi://status/health
```

#### Returns

```json
{
  "status": "running",
  "running": true,
  "pid": 12345,
  "uptimeSeconds": 3600,
  "cpuUsagePercent": 2.5,
  "memoryUsageMB": 150.32,
  "configPath": "/etc/obi/config.yaml",
  "timestamp": "2025-11-14T10:30:00.000Z"
}
```

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Current status: `running`, `stopped`, or `unknown` |
| `running` | boolean | Whether OBI is currently running |
| `pid` | number | Process ID (only when running) |
| `uptimeSeconds` | number | Process uptime in seconds (only when running) |
| `cpuUsagePercent` | number | CPU usage percentage (only when running) |
| `memoryUsageMB` | number | Memory usage in megabytes (only when running) |
| `configPath` | string | Path to active configuration file |
| `lastError` | string | Last error message (if any) |
| `timestamp` | string | ISO 8601 timestamp of health check |

---

### obi://logs/recent

**Name**: Recent OBI Logs
**MIME Type**: `text/plain`

#### Description

Last 100 lines from OBI logs. Provides quick access to recent log entries without requiring tool invocation.

#### URI

```
obi://logs/recent
```

#### Returns

```
[2025-11-14 10:23:45] [INFO] OBI started successfully
[2025-11-14 10:23:46] [INFO] Loading eBPF programs
[2025-11-14 10:23:47] [INFO] Attached to process: nginx (PID: 1234)
[2025-11-14 10:23:48] [WARN] High memory usage detected
[2025-11-14 10:23:49] [INFO] Exporting traces to localhost:4317
...
```

#### No Logs Available

```
No logs available
```

---

## Prompts

MCP prompts provide guided workflows and templates for common tasks.

### setup-obi-local

**Name**: Setup OBI Local Deployment
**Description**: Guided setup for deploying OBI (OpenTelemetry eBPF Instrumentation) locally

#### Arguments

```json
{
  "environment": {
    "type": "string",
    "description": "Target environment type (development/production)",
    "required": false,
    "default": "development"
  }
}
```

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `environment` | string | No | `development` | Target environment: `development` or `production` |

#### Template Structure

The prompt provides a comprehensive step-by-step guide including:

1. **Prerequisites Check**
   - Kernel version validation (5.8+)
   - Sudo access verification
   - Dependency checks
   - Optional tool installation (bpftool)

2. **Configuration Setup**
   - Configuration file location guidance
   - Template configurations for dev/prod
   - Environment-specific settings
   - Security configurations

3. **Deployment Options**
   - **Option A**: Binary deployment (recommended)
   - **Option B**: Docker deployment
   - **Option C**: Build from source
   - Environment-specific commands

4. **Verification Steps**
   - Process status checks
   - eBPF program validation
   - Instrumentation testing
   - Telemetry export verification

5. **Troubleshooting Guide**
   - Common issues and solutions:
     - Permission denied errors
     - Kernel version issues
     - eBPF loading problems
     - Telemetry export failures
     - Resource usage problems
   - Debug mode instructions
   - Support resources

6. **Next Steps**
   - Configuration customization
   - Dashboard setup
   - Alert configuration
   - Performance tuning
   - Production hardening checklist (production only)

#### Example Usage

**Development Setup**:
```
User: "Help me set up OBI for development"
AI: [Calls setup-obi-local prompt with environment='development']
```

**Production Setup**:
```
User: "Guide me through OBI production deployment"
AI: [Calls setup-obi-local prompt with environment='production']
```

#### Production-Specific Features

When `environment='production'`, the prompt includes:

- TLS configuration for OTLP
- Systemd service setup
- File permission hardening
- Log rotation configuration
- Production checklist:
  - [ ] TLS enabled for OTLP export
  - [ ] Configuration file secured (600 permissions)
  - [ ] Systemd service configured
  - [ ] Log rotation set up
  - [ ] Resource limits defined
  - [ ] Monitoring/alerting configured
  - [ ] Backup/recovery plan documented
  - [ ] Security audit completed

---

## Error Handling

All tools and resources implement consistent error handling:

### Tool Error Response Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: <error message>"
    }
  ],
  "isError": true
}
```

### Resource Error Response Format

```json
{
  "contents": [
    {
      "uri": "<resource-uri>",
      "mimeType": "<mime-type>",
      "text": "{\"error\": \"<error type>\", \"message\": \"<error details>\"}"
    }
  ]
}
```

### Common Error Types

- **Validation Errors**: Invalid input parameters or configuration
- **Permission Errors**: Insufficient privileges (missing sudo)
- **Process Errors**: OBI process not running or unresponsive
- **File System Errors**: Configuration file not found or inaccessible
- **Network Errors**: Unable to connect to OTLP endpoint

---

## Type Definitions

### OBI Configuration

```typescript
interface ObiConfig {
  network?: {
    enable?: boolean;
    allowed_attributes?: string[];
    cidrs?: Array<{
      cidr: string;
      name: string;
    }>;
  };
  attributes?: {
    kubernetes?: {
      enable?: boolean;
    };
  };
  export?: {
    otlp?: {
      endpoint?: string;
      protocol?: 'grpc' | 'http/protobuf';
    };
  };
}
```

### OBI Status

```typescript
interface ObiStatus {
  status: 'running' | 'stopped' | 'unknown';
  pid?: number;
  uptime?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  configPath?: string;
  lastError?: string;
}
```

### Deployment Options

```typescript
interface DeploymentOptions {
  mode: 'standalone' | 'docker' | 'kubernetes';
  config?: ObiConfig;
  configPath?: string;
  binaryPath?: string;
}
```

---

## Version History

- **v0.1.0** (2025-11-14): Initial release
  - 6 tools
  - 3 resources
  - 1 prompt
  - Complete TypeScript support
