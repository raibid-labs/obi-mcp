# Architecture

System design and technical architecture for the OBI MCP Server.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [MCP Protocol Integration](#mcp-protocol-integration)
- [OBI Integration](#obi-integration)
- [Process Management](#process-management)
- [Configuration Management](#configuration-management)
- [Error Handling](#error-handling)
- [Security Model](#security-model)
- [Performance Considerations](#performance-considerations)

---

## System Overview

The OBI MCP Server acts as a bridge between MCP-compatible AI clients (like Claude Desktop) and the OpenTelemetry eBPF Instrumentation (OBI) process. It translates natural language requests into OBI management operations.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Client Layer                        │
│                  (Claude Desktop, etc.)                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Natural    │  │   Tool       │  │   Resource   │    │
│  │   Language   │──│   Requests   │──│   Queries    │    │
│  │   Interface  │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ MCP Protocol (stdio)
                           │ JSON-RPC 2.0
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   OBI MCP Server (Node.js)                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              MCP Server Core                        │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │  Request Handlers                           │   │  │
│  │  │  • ListTools    • CallTool                  │   │  │
│  │  │  • ListResources • ReadResource             │   │  │
│  │  │  • ListPrompts  • GetPrompt                 │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────┐       │
│  │                        │                        │       │
│  ▼                        ▼                        ▼       │
│ ┌──────────┐       ┌────────────┐         ┌──────────┐   │
│ │  Tools   │       │ Resources  │         │ Prompts  │   │
│ │  (6)     │       │  (3)       │         │  (1)     │   │
│ └────┬─────┘       └─────┬──────┘         └──────────┘   │
│      │                   │                                 │
│      └───────────────────┼─────────────────────────┐      │
│                          │                         │      │
│                          ▼                         │      │
│              ┌───────────────────────┐             │      │
│              │   OBI Manager         │             │      │
│              │                       │             │      │
│              │  • Process Mgmt       │             │      │
│              │  • Config Mgmt        │             │      │
│              │  • Log Streaming      │             │      │
│              │  • Status Monitoring  │             │      │
│              └───────────┬───────────┘             │      │
│                          │                         │      │
│              ┌───────────▼───────────┐             │      │
│              │   Utilities           │             │      │
│              │  • Logger             │             │      │
│              │  • Process Helper     │◄────────────┘      │
│              │  • Validation         │                    │
│              └───────────┬───────────┘                    │
└──────────────────────────┼────────────────────────────────┘
                           │
                           │ spawn/exec
                           │ SIGTERM/SIGKILL
                           │ stdout/stderr
                           │
                ┌──────────▼──────────┐
                │   OBI Process       │
                │   (eBPF)            │
                │                     │
                │  ┌──────────────┐  │
                │  │ eBPF Probes  │  │
                │  └──────────────┘  │
                │  ┌──────────────┐  │
                │  │ Telemetry    │  │
                │  │ Collection   │  │
                │  └──────────────┘  │
                │  ┌──────────────┐  │
                │  │ OTLP Export  │  │
                │  └──────────────┘  │
                └─────────────────────┘
                           │
                           │ Network traces/metrics
                           │
                ┌──────────▼──────────┐
                │ Observability       │
                │ Backend             │
                │ (Jaeger, Prometheus)│
                └─────────────────────┘
```

---

## Component Architecture

### 1. MCP Server Core

**Location**: `/src/server/index.ts`

**Responsibilities**:
- Initialize MCP server with stdio transport
- Register request handlers for MCP protocol
- Route requests to appropriate tools/resources/prompts
- Handle protocol-level errors

**Key Classes**:
```typescript
class ObiMcpServer {
  private server: Server;              // MCP SDK server instance
  private tools: Map<string, Tool>;    // Registered tools
  private toolHandlers: Map<...>;      // Tool implementation handlers
  private prompts: Prompt[];           // Registered prompts
}
```

**Dependencies**:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- Tool implementations (`/src/tools/*`)
- Resource handlers (`/src/resources/index.ts`)
- Prompt templates (`/src/prompts/*`)

---

### 2. Tools Layer

**Location**: `/src/tools/*.ts`

**Architecture Pattern**: Command Pattern

Each tool follows this structure:
```typescript
// Tool definition (MCP metadata)
export const toolName: Tool = {
  name: 'obi_tool_name',
  description: 'What the tool does...',
  inputSchema: { /* JSON Schema */ }
};

// Argument validation (runtime type checking)
const ArgsSchema = z.object({ /* Zod schema */ });

// Handler implementation (business logic)
export async function handleTool(args: unknown) {
  // 1. Validate args
  const validated = ArgsSchema.parse(args);

  // 2. Execute operation via ObiManager
  const result = await obiManager.operation(validated);

  // 3. Format response
  return formatResponse(result);
}
```

**Available Tools**:
1. `obi_get_status` - Status checking
2. `obi_deploy_local` - Deployment
3. `obi_get_config` - Configuration retrieval
4. `obi_update_config` - Configuration updates
5. `obi_get_logs` - Log retrieval
6. `obi_stop` - Process termination

**Design Principles**:
- **Single Responsibility**: Each tool does one thing well
- **Input Validation**: Zod schemas for runtime safety
- **Error Handling**: Try-catch with formatted error responses
- **Formatted Output**: Human-readable text responses

---

### 3. Resources Layer

**Location**: `/src/resources/index.ts`

**Architecture Pattern**: Repository Pattern

Resources provide read-only access to OBI state:

```typescript
// Resource definitions
export const resources: Resource[] = [
  {
    uri: 'obi://config/current',
    name: 'Current OBI Configuration',
    description: '...',
    mimeType: 'application/json'
  },
  // ...
];

// Resource handler (router)
export async function handleResourceRead(uri: string) {
  switch (uri) {
    case OBI_RESOURCE_URIS.CONFIG_CURRENT:
      return await readCurrentConfig(uri);
    // ...
  }
}
```

**Available Resources**:
1. `obi://config/current` - Live configuration
2. `obi://status/health` - Health metrics
3. `obi://logs/recent` - Recent logs

**Design Principles**:
- **Read-Only**: Resources never mutate state
- **Real-Time**: Always return current state
- **Structured Data**: JSON or text formats
- **Error Handling**: Graceful degradation

---

### 4. Prompts Layer

**Location**: `/src/prompts/*.ts`

**Architecture Pattern**: Template Method Pattern

Prompts provide guided workflows:

```typescript
// Prompt definition
export const setupLocalPrompt: Prompt = {
  name: 'setup-obi-local',
  description: 'Guided setup...',
  arguments: [
    { name: 'environment', required: false }
  ]
};

// Template generator
export function getTemplate(args?: { environment?: string }): string {
  const env = args?.environment || 'development';
  const isProd = env === 'production';

  return `
    # Step 1: Prerequisites
    ${isProd ? prodSteps : devSteps}

    # Step 2: Configuration
    ...
  `;
}
```

**Available Prompts**:
1. `setup-obi-local` - Deployment guide

**Design Principles**:
- **Environment-Aware**: Different templates for dev/prod
- **Comprehensive**: Cover prerequisites, deployment, troubleshooting
- **Step-by-Step**: Clear numbered steps
- **Code Examples**: Ready-to-run commands

---

### 5. OBI Manager

**Location**: `/src/utils/obi-manager.ts`

**Architecture Pattern**: Facade Pattern + Singleton

The OBI Manager provides a unified interface to all OBI operations:

```typescript
class ObiManager {
  private pid: number | null = null;
  private configPath: string | null = null;
  private processStartTime: number | null = null;

  // Process lifecycle
  async deployLocal(options: DeploymentOptions): Promise<Result>;
  async stop(): Promise<Result>;

  // Status and monitoring
  async getStatus(verbose: boolean): Promise<ObiStatus>;
  async getLogs(lines: number): Promise<string[]>;

  // Configuration management
  async getConfig(): Promise<ObiConfig | null>;
  async updateConfig(config, merge, restart): Promise<Result>;
}

export default new ObiManager(); // Singleton instance
```

**Key Responsibilities**:
1. **Process Management**: Spawn, monitor, terminate OBI
2. **State Tracking**: PID, config path, start time
3. **Configuration**: Read, write, merge, validate
4. **Log Access**: Read and filter log files
5. **Health Monitoring**: CPU, memory, uptime

**Design Principles**:
- **Singleton**: One manager instance for one OBI process
- **Stateful**: Tracks running process state
- **Async**: All operations return Promises
- **Error Handling**: Detailed error messages with context

---

## Data Flow

### Tool Execution Flow

```
User Input (Claude)
      │
      ▼
┌─────────────────┐
│ "Deploy OBI"    │  Natural Language
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ MCP Client              │  MCP Protocol
│ • Parse intent          │  (JSON-RPC 2.0)
│ • Select tool           │
│ • Build arguments       │
└────────┬────────────────┘
         │
         │ CallTool Request
         │ { name: "obi_deploy_local", arguments: {...} }
         │
         ▼
┌────────────────────────────┐
│ OBI MCP Server             │
│ • Receive request          │
│ • Route to handler         │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Tool Handler               │
│ • Validate arguments       │ ← Zod Schema
│ • Call ObiManager method   │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ OBI Manager                │
│ • Prepare config           │
│ • Spawn OBI process        │
│ • Track PID                │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Process Utilities          │
│ • child_process.spawn      │
│ • Monitor stdout/stderr    │
│ • Handle exit codes        │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ OBI Process                │
│ • Load eBPF programs       │
│ • Start instrumentation    │
│ • Export telemetry         │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Result                     │
│ { success: true, pid: ... }│
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Formatted Response         │
│ "=== OBI Deployment ===" │
│ Status: SUCCESS            │
│ PID: 12345                 │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ MCP Client                 │
│ • Parse response           │
│ • Display to user          │
└────────────────────────────┘
         │
         ▼
    User sees result
```

### Resource Read Flow

```
Resource Request
      │
      ▼
┌────────────────────────────┐
│ ReadResource Request       │
│ { uri: "obi://status/..." }│
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Resource Handler           │
│ • Parse URI                │
│ • Route to reader          │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Specific Reader            │
│ • Call ObiManager          │
│ • Get current state        │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Format Response            │
│ • JSON or text             │
│ • Add timestamp            │
└────────┬───────────────────┘
         │
         ▼
    Return to client
```

---

## MCP Protocol Integration

### Transport Layer

**Protocol**: JSON-RPC 2.0 over stdio
**Transport**: StdioServerTransport from MCP SDK

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Communication**:
- **Input**: stdin (JSON-RPC requests from client)
- **Output**: stdout (JSON-RPC responses to client)
- **Logging**: stderr (debug/error logs)

### Request/Response Format

**Tool Call Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "obi_get_status",
    "arguments": {
      "verbose": true
    }
  }
}
```

**Tool Call Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "=== OBI Status ===\n..."
      }
    ]
  }
}
```

### Supported Request Types

1. **tools/list** - List available tools
2. **tools/call** - Execute a tool
3. **resources/list** - List available resources
4. **resources/read** - Read a resource
5. **prompts/list** - List available prompts
6. **prompts/get** - Get a prompt template

---

## OBI Integration

### Process Lifecycle

**Spawning OBI**:
```typescript
const obiProcess = spawn('sudo', ['obi', '--config', configPath], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

// Track PID
this.pid = obiProcess.pid;

// Monitor output
obiProcess.stdout.on('data', (data) => { /* log */ });
obiProcess.stderr.on('data', (data) => { /* log */ });

// Handle exit
obiProcess.on('exit', (code) => {
  this.pid = null;
  // cleanup
});
```

**Monitoring OBI**:
```typescript
// Check if process is running
const isRunning = this.pid && processExists(this.pid);

// Get resource usage
const usage = await getProcessStats(this.pid);
// { cpu: 2.5, memory: 150.32, uptime: 3600 }
```

**Stopping OBI**:
```typescript
// Graceful shutdown
process.kill(this.pid, 'SIGTERM');

// Wait for exit (with timeout)
await waitForExit(this.pid, 5000);

// Force kill if needed
if (processExists(this.pid)) {
  process.kill(this.pid, 'SIGKILL');
}
```

### Configuration Management

**Config File Handling**:
```typescript
// Write config
await fs.writeFile(configPath, yaml.stringify(config));

// Read config
const content = await fs.readFile(configPath, 'utf-8');
const config = yaml.parse(content);

// Merge configs
const merged = deepMerge(existingConfig, newConfig);
```

**Validation**:
```typescript
const ObiConfigSchema = z.object({
  network: z.object({ ... }).optional(),
  attributes: z.object({ ... }).optional(),
  export: z.object({ ... }).optional()
});

const validated = ObiConfigSchema.parse(config);
```

---

## Process Management

### Process States

```
┌─────────┐
│ Stopped │ ──deploy──┐
└─────────┘           │
                      ▼
                ┌──────────┐
          ┌─────│ Starting │
          │     └──────────┘
          │           │
    error │           │ success
          │           ▼
          │     ┌──────────┐
          └────▶│ Running  │◀──┐
                └──────────┘   │
                      │         │
                 stop │         │ health check
                      │         │
                      ▼         │
                ┌──────────┐   │
                │ Stopping │───┘
                └──────────┘
                      │
                 exit │
                      ▼
                ┌─────────┐
                │ Stopped │
                └─────────┘
```

### Process Tracking

**State Variables**:
```typescript
private pid: number | null = null;           // Process ID
private configPath: string | null = null;    // Active config
private processStartTime: number | null;     // Start timestamp
private lastError: string | null = null;     // Last error message
```

**Health Checks**:
```typescript
async getStatus(verbose: boolean): Promise<ObiStatus> {
  if (!this.pid) {
    return { status: 'stopped' };
  }

  const exists = await processExists(this.pid);
  if (!exists) {
    this.pid = null;
    return { status: 'stopped' };
  }

  const status: ObiStatus = {
    status: 'running',
    pid: this.pid,
    uptime: Date.now() - this.processStartTime
  };

  if (verbose) {
    const stats = await getProcessStats(this.pid);
    status.cpuUsage = stats.cpu;
    status.memoryUsage = stats.memory;
  }

  return status;
}
```

---

## Configuration Management

### Configuration Schema

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

### Config Operations

**Update with Merge**:
```typescript
async updateConfig(newConfig, merge = true, restart = false) {
  // Get existing config
  const existing = await this.getConfig();

  // Merge or replace
  const final = merge
    ? deepMerge(existing, newConfig)
    : newConfig;

  // Validate
  const validated = ObiConfigSchema.parse(final);

  // Write to file
  await fs.writeFile(this.configPath, yaml.stringify(validated));

  // Restart if requested
  if (restart && this.pid) {
    await this.stop();
    await this.deployLocal({ configPath: this.configPath });
  }

  return { success: true, data: validated };
}
```

---

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid input from user/client
2. **Process Errors**: OBI process failures
3. **File System Errors**: Config file issues
4. **Permission Errors**: Sudo/root access required
5. **Network Errors**: OTLP endpoint unreachable

### Error Response Format

**Tool Error**:
```typescript
return {
  content: [
    {
      type: 'text',
      text: `Error: ${errorMessage}\n${errorDetails}`
    }
  ],
  isError: true
};
```

**Resource Error**:
```typescript
return {
  contents: [
    {
      uri: resourceUri,
      mimeType: 'application/json',
      text: JSON.stringify({
        error: 'Error Type',
        message: 'Detailed message'
      })
    }
  ]
};
```

### Error Logging

All errors are logged with context:
```typescript
logger.error('Operation failed', {
  operation: 'deploy',
  args: { configPath },
  error: error.message,
  stack: error.stack
});
```

---

## Security Model

### Privilege Requirements

- **OBI Process**: Requires root/sudo for eBPF
- **MCP Server**: Can run as normal user
- **Config Files**: Recommended 600 permissions

### Security Boundaries

```
┌─────────────────────────────────┐
│ MCP Client (User Privilege)    │
│ • Claude Desktop                │
│ • No sudo required              │
└────────────┬────────────────────┘
             │ stdio (no elevation)
             │
┌────────────▼────────────────────┐
│ MCP Server (User Privilege)    │
│ • Node.js process               │
│ • Validates input               │
│ • Formats output                │
└────────────┬────────────────────┘
             │ spawn with sudo
             │
┌────────────▼────────────────────┐
│ OBI Process (Root Privilege)   │
│ • Requires CAP_SYS_ADMIN        │
│ • eBPF program loading          │
│ • Kernel instrumentation        │
└─────────────────────────────────┘
```

### Input Validation

**All inputs validated with Zod**:
```typescript
const ArgsSchema = z.object({
  verbose: z.boolean().optional(),
  configPath: z.string().optional(),
  // ...
});

const validated = ArgsSchema.parse(untrustedInput);
```

**Config validation before OBI deployment**:
```typescript
const validated = ObiConfigSchema.parse(config);
// Only validated configs are written to disk
```

---

## Performance Considerations

### Optimization Strategies

1. **Singleton Pattern**: One ObiManager instance
2. **Process Caching**: Track PID instead of re-discovering
3. **Lazy Loading**: Load configs only when needed
4. **Stream Processing**: Use streams for large log files
5. **Async Operations**: Non-blocking I/O throughout

### Resource Usage

**MCP Server**:
- Memory: ~50MB
- CPU: < 1% idle, < 5% during operations
- Disk: Minimal (logs only)

**OBI Process** (varies by workload):
- Memory: 100-500MB
- CPU: 1-10% (depending on instrumentation scope)
- Disk: Log files grow over time

### Scalability Limits

**Current (v0.1.0)**:
- Single OBI instance per MCP server
- Local process management only
- Synchronous log reading (may block on large files)

**Future Improvements**:
- Multi-instance support
- Remote OBI management
- Streaming log API
- Metrics aggregation

---

## Technology Stack

### Runtime
- **Node.js**: 18.0.0+ (LTS)
- **TypeScript**: 5.7.2 (strict mode)

### Core Dependencies
- **@modelcontextprotocol/sdk**: 1.0.4 - MCP protocol
- **zod**: 3.23.8 - Runtime validation
- **winston**: 3.17.0 - Logging
- **yaml**: 2.6.1 - Config parsing

### Development
- **vitest**: 2.1.8 - Testing
- **typescript**: 5.7.2 - Compilation
- **eslint**: 9.17.0 - Linting
- **prettier**: 3.4.2 - Formatting

---

## Design Patterns

### Patterns Used

1. **Facade**: ObiManager provides simple interface to complex OBI operations
2. **Singleton**: One ObiManager instance manages one OBI process
3. **Command**: Each tool is a command object with execute method
4. **Repository**: Resources provide read-only access to state
5. **Template Method**: Prompts use templates with customization points
6. **Strategy**: Different deployment strategies (config vs configPath)

### Anti-Patterns Avoided

1. **God Object**: Split concerns across layers (server, tools, manager)
2. **Callback Hell**: Use async/await throughout
3. **Magic Numbers**: Named constants for timeouts, limits
4. **Silent Failures**: Explicit error handling and logging
5. **Tight Coupling**: Dependency injection where appropriate

---

## Testing Architecture

### Test Structure

```
tests/
├── unit/              # Isolated component tests
│   ├── tools/         # Tool handler tests
│   ├── resources/     # Resource handler tests
│   ├── prompts/       # Prompt template tests
│   └── utils/         # Utility function tests
├── integration/       # Component integration tests
│   ├── server/        # MCP server tests
│   └── obi-manager/   # OBI manager tests
└── e2e/               # End-to-end workflows
    └── obi-lifecycle/ # Complete lifecycle tests
```

### Test Coverage Goals

- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: 100%
- **Lines**: > 95%

**Current**: 99.81% statements, 96.49% branches, 100% functions

---

## Future Architecture Enhancements

### v0.2.0 - Enhanced Features

- Docker deployment support
- Kubernetes integration
- Metrics aggregation service
- OTLP endpoint validation

### v0.3.0 - Advanced Capabilities

- Multi-instance management
- Remote OBI control (SSH/gRPC)
- Real-time metrics streaming
- Dashboard generation
- Plugin architecture

### v1.0.0 - Production Release

- High availability setup
- Load balancing support
- Distributed tracing
- Advanced security features
- Enterprise integrations

---

## References

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [OpenTelemetry OBI Docs](https://opentelemetry.io/docs/zero-code/obi/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
