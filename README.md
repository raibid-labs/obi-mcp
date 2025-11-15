# OBI MCP Server

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/raibid-labs/obi-mcp/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-270%20passed-success.svg)](./tests)
[![Coverage](https://img.shields.io/badge/coverage-99.81%25-brightgreen.svg)](./tests)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)

> Model Context Protocol (MCP) server for OpenTelemetry eBPF Instrumentation (OBI)

Enable AI assistants to deploy, configure, and analyze application observability using OpenTelemetry's zero-code eBPF instrumentation.

## Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Available Tools](#-available-tools)
- [Resources](#-resources)
- [Prompts](#-prompts)
- [Prerequisites](#-prerequisites)
- [Documentation](#-documentation)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Features

- **6 MCP Tools**: Complete OBI lifecycle management through AI assistants
- **3 MCP Resources**: Real-time access to configuration, status, and logs
- **1 MCP Prompt**: Guided local deployment setup
- **Zero-Code Instrumentation via AI**: Deploy OBI with natural language commands
- **Process Lifecycle Management**: Start, stop, and monitor OBI processes
- **Configuration Management**: Update OBI configuration through AI assistance
- **Log Analysis**: Query and analyze OBI telemetry output
- **Multi-Platform**: Works with any MCP-compatible AI client (Claude Desktop, Continue, etc.)
- **99.81% Test Coverage**: Comprehensive test suite with 270 tests
- **Full TypeScript Support**: Type-safe implementation with complete type definitions

## 🚀 Quick Start

### 5-Minute Setup

#### 1. Install Dependencies

```bash
# Clone the repository
git clone https://github.com/raibid-labs/obi-mcp.git
cd obi-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

#### 2. Configure Claude Desktop

Add to your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obi": {
      "command": "node",
      "args": ["/absolute/path/to/obi-mcp/dist/index.js"]
    }
  }
}
```

Or, after publishing to npm:

```json
{
  "mcpServers": {
    "obi": {
      "command": "npx",
      "args": ["obi-mcp-server"]
    }
  }
}
```

#### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop to load the MCP server.

#### 4. Use with Claude

```
You: "Deploy OBI with default configuration"
Claude: [Uses obi_deploy_local tool to start OBI]

You: "What's the current status of OBI?"
Claude: [Uses obi_get_status tool to check health]

You: "Show me the recent logs"
Claude: [Uses obi_get_logs tool to fetch logs]
```

## 🛠️ Available Tools

The OBI MCP Server provides 6 tools for managing OpenTelemetry eBPF Instrumentation:

### 1. `obi_get_status`

Get the current status of the OBI process.

**Arguments:**
- `verbose` (boolean, optional): Include detailed process information (CPU, memory, uptime)
  - Default: `false`

**Example usage in Claude:**
```
"What's the status of OBI?"
"Check if OBI is running and show me detailed metrics"
"Is OBI healthy?"
```

**Returns:**
```
=== OBI Status ===
Status: running
PID: 12345
Uptime: 3600s

--- Details ---
CPU Usage: 2.5%
Memory Usage: 150.32 MB
Config Path: /path/to/obi-config.yml
```

---

### 2. `obi_deploy_local`

Deploy OBI locally in standalone mode.

**Arguments:**
- `config` (object, optional): OBI configuration object
- `configPath` (string, optional): Path to OBI configuration file
- `binaryPath` (string, optional): Path to OBI binary (uses PATH if not provided)

**Note**: Either `config` or `configPath` should be provided.

**Example usage in Claude:**
```
"Deploy OBI with default configuration"
"Start OBI using the config at /etc/obi/config.yaml"
"Deploy OBI with network monitoring enabled"
```

**Returns:**
```
=== OBI Local Deployment ===

Status: SUCCESS
Message: OBI deployed successfully
PID: 12345
Config Path: /tmp/obi-config.yaml
```

---

### 3. `obi_get_config`

Retrieve the current OBI configuration.

**Arguments:** None

**Example usage in Claude:**
```
"Show me the current OBI configuration"
"What's the active configuration?"
"Get OBI config"
```

**Returns:**
```
=== OBI Configuration ===

{
  "network": {
    "enable": true,
    "allowed_attributes": ["http.method", "http.status_code"]
  },
  "export": {
    "otlp": {
      "endpoint": "localhost:4317",
      "protocol": "grpc"
    }
  }
}
```

---

### 4. `obi_update_config`

Update the OBI configuration with validation.

**Arguments:**
- `config` (object, required): New configuration object (or partial config if merge=true)
  - `network` (object, optional): Network instrumentation settings
    - `enable` (boolean): Enable network monitoring
    - `allowed_attributes` (string[]): Allowed HTTP attributes
    - `cidrs` (array): CIDR configurations
  - `attributes` (object, optional): Attribute settings
    - `kubernetes.enable` (boolean): Enable Kubernetes attributes
  - `export` (object, optional): Export configuration
    - `otlp.endpoint` (string): OTLP endpoint URL
    - `otlp.protocol` (string): Protocol (grpc or http/protobuf)
- `merge` (boolean, optional): Merge with existing config (default: true)
- `restart` (boolean, optional): Restart OBI after updating (default: false)

**Example usage in Claude:**
```
"Update the OTLP endpoint to localhost:4318"
"Enable Kubernetes attributes in the config"
"Change the configuration and restart OBI"
```

**Returns:**
```
=== OBI Config Update ===

Status: Success
Message: Configuration updated successfully

Note: Restart OBI for changes to take effect.

--- Updated Configuration ---
{...}
```

---

### 5. `obi_get_logs`

Retrieve recent logs from the OBI process.

**Arguments:**
- `lines` (number, optional): Number of recent log lines to retrieve
  - Default: `100`
  - Range: 1-10000
- `level` (string, optional): Filter logs by level
  - Options: `info`, `warn`, `error`, `debug`, `all`

**Example usage in Claude:**
```
"Show me the last 50 lines of OBI logs"
"Get error logs from OBI"
"Show recent debug logs"
```

**Returns:**
```
=== OBI Logs === [Level: ERROR] [Last 5 lines]

[2025-11-14 10:23:45] [ERROR] Failed to connect to OTLP endpoint
[2025-11-14 10:23:46] [ERROR] Retrying connection...
[2025-11-14 10:24:00] [ERROR] Connection timeout

--- End of Logs ---
```

---

### 6. `obi_stop`

Stop the running OBI process.

**Arguments:**
- `force` (boolean, optional): Force immediate termination using SIGKILL
  - Default: `false` (uses graceful SIGTERM)

**Example usage in Claude:**
```
"Stop OBI"
"Shut down the OBI process"
"Force stop OBI immediately"
```

**Returns:**
```
=== OBI Stop ===

Status: Success
Message: OBI process stopped successfully

The OBI process has been stopped successfully.
```

---

## 📦 Resources

MCP resources provide read-only access to OBI state and configuration. These can be used by AI assistants to get real-time information.

### `obi://config/current`

**Name**: Current OBI Configuration
**MIME Type**: `application/json`
**Description**: The current OBI configuration in JSON format

**Usage in Claude:**
```
"Read the current OBI configuration resource"
```

**Returns**: Current configuration as JSON

---

### `obi://status/health`

**Name**: OBI Process Health
**MIME Type**: `application/json`
**Description**: Current health status and metrics of the OBI process

**Usage in Claude:**
```
"Check the OBI health resource"
"Show me the health status"
```

**Returns**:
```json
{
  "status": "running",
  "running": true,
  "pid": 12345,
  "uptimeSeconds": 3600,
  "cpuUsagePercent": 2.5,
  "memoryUsageMB": 150.32,
  "configPath": "/tmp/obi-config.yaml",
  "timestamp": "2025-11-14T10:30:00.000Z"
}
```

---

### `obi://logs/recent`

**Name**: Recent OBI Logs
**MIME Type**: `text/plain`
**Description**: Last 100 lines from OBI logs

**Usage in Claude:**
```
"Read the recent logs resource"
```

**Returns**: Plain text log entries (last 100 lines)

---

## 💬 Prompts

MCP prompts provide guided workflows for common tasks.

### `setup-obi-local`

**Name**: Setup OBI Local Deployment
**Description**: Guided setup for deploying OBI (OpenTelemetry eBPF Instrumentation) locally

**Arguments:**
- `environment` (string, optional): Target environment type
  - Options: `development`, `production`
  - Default: `development`

**Usage in Claude:**
```
"Use the setup-obi-local prompt"
"Guide me through setting up OBI for production"
```

**Provides**:
- Prerequisites check (kernel version, sudo access, dependencies)
- Configuration file templates
- Deployment options (binary, Docker, from source)
- Verification steps
- Troubleshooting guide
- Production checklist (when environment=production)

---

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **Linux** kernel 5.8+ (for OBI eBPF support)
- **OBI binary** installed ([installation guide](https://opentelemetry.io/docs/zero-code/obi/))
- **Root/sudo access** (required by OBI for eBPF operations)

### Optional
- **Docker** (for containerized deployments)
- **bpftool** (for debugging eBPF programs)
- **OpenTelemetry Collector** (for receiving telemetry data)

## 📚 Documentation

- [API Reference](./docs/API.md) - Complete tool, resource, and prompt specifications
- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [Quick Start Guide](./docs/QUICKSTART.md) - Getting started guide
- [Semantic Versioning](./docs/SEMANTIC_VERSIONING.md) - Commit messages and versioning
- [Release Process](./docs/RELEASING.md) - How to create releases
- [Roadmap](./docs/ROADMAP.md) - Future features and timeline
- [Changelog](./CHANGELOG.md) - Version history and release notes

## 🧪 Testing

The project has comprehensive test coverage with **270 tests** and **99.81% coverage**.

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run unit tests only
npm run test:unit

# Run integration tests (requires OBI binary)
npm run test:integration

# Run E2E tests
npm run test:e2e

# Watch mode
npm run test -- --watch
```

### Test Breakdown
- **Unit Tests**: Tool handlers, resource handlers, utilities
- **Integration Tests**: MCP protocol integration, OBI manager
- **E2E Tests**: Complete lifecycle workflows

## 🏗️ Project Structure

```
obi-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server/
│   │   └── index.ts          # MCP server implementation
│   ├── tools/                # MCP tools (6 tools)
│   │   ├── index.ts          # Tool exports
│   │   ├── status.ts         # obi_get_status
│   │   ├── deploy-local.ts   # obi_deploy_local
│   │   ├── get-config.ts     # obi_get_config
│   │   ├── update-config.ts  # obi_update_config
│   │   ├── get-logs.ts       # obi_get_logs
│   │   └── stop.ts           # obi_stop
│   ├── resources/            # MCP resources (3 resources)
│   │   └── index.ts          # Resource handlers
│   ├── prompts/              # MCP prompts (1 prompt)
│   │   ├── index.ts          # Prompt exports
│   │   └── setup-local.ts    # setup-obi-local prompt
│   ├── types/
│   │   ├── obi.ts            # OBI type definitions
│   │   └── mcp.ts            # MCP type definitions
│   └── utils/
│       ├── logger.ts         # Logging utility
│       ├── process.ts        # Process management
│       └── obi-manager.ts    # OBI lifecycle manager
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── docs/
│   ├── API.md               # API reference
│   ├── ARCHITECTURE.md      # Architecture documentation
│   ├── QUICKSTART.md        # Quick start guide
│   ├── SEMANTIC_VERSIONING.md  # Commit message guide
│   ├── RELEASING.md         # Release process
│   ├── RELEASE_QUICKSTART.md   # Quick release reference
│   └── ROADMAP.md           # Feature roadmap
├── examples/
│   └── configs/             # Example configurations
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

## 🗺️ Roadmap

### ✅ v0.1.0 - MVP (Current Release)
- [x] TypeScript project structure
- [x] MCP server with stdio transport
- [x] 6 MCP tools for OBI management
- [x] 3 MCP resources for config/status/logs
- [x] 1 MCP prompt for guided setup
- [x] Comprehensive test suite (270 tests, 99.81% coverage)
- [x] Complete documentation
- [x] Full TypeScript support

### 🚧 v0.2.0 - Enhanced Features (Next)
- [ ] Docker deployment support
- [ ] Basic Kubernetes integration
- [ ] Metrics aggregation and analysis
- [ ] OTLP endpoint integration
- [ ] Configuration validation tool
- [ ] Performance benchmarking

### 🔮 v0.3.0 - Advanced Capabilities (Future)
- [ ] Multi-instance OBI management
- [ ] Advanced filtering and querying
- [ ] Custom instrumentation targets
- [ ] Integration with observability platforms
- [ ] Real-time metrics streaming
- [ ] Dashboard generation

See [ROADMAP.md](./docs/ROADMAP.md) for detailed timeline and feature specifications.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Development Workflow

```bash
# Install dependencies
npm install

# Watch TypeScript compilation
npm run watch

# Run in development mode
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Run all quality checks
npm run lint && npm run typecheck && npm run test:all && npm run build
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Common types:**

| Type | Effect | Example |
|------|--------|---------|
| `feat` | MINOR version | `feat(tools): add Docker deployment` |
| `fix` | PATCH version | `fix(status): handle edge case` |
| `docs` | PATCH version | `docs(api): update examples` |
| `perf` | PATCH version | `perf(logs): optimize reading` |
| `refactor` | PATCH version | `refactor: simplify manager` |
| `test` | PATCH version | `test: add E2E tests` |
| `chore` | PATCH version | `chore(deps): update packages` |
| `feat!` | MAJOR version | `feat!: change API format` |

**Examples:**
```bash
# New feature
git commit -m "feat(tools): add Kubernetes deployment support"

# Bug fix
git commit -m "fix(status): prevent crash when OBI is not running"

# Breaking change
git commit -m "feat(config)!: restructure configuration schema

BREAKING CHANGE: Config format has changed. See migration guide."

# Documentation
git commit -m "docs(readme): add troubleshooting section"
```

**See detailed guide:** [docs/SEMANTIC_VERSIONING.md](./docs/SEMANTIC_VERSIONING.md)

### Release Process

Releases are automated through conventional commits:

```bash
# Create release (choose based on your changes)
npm run release         # PATCH: 0.1.0 → 0.1.1 (bug fixes)
npm run release:minor   # MINOR: 0.1.0 → 0.2.0 (new features)
npm run release:major   # MAJOR: 0.1.0 → 1.0.0 (breaking changes)

# Or use just
just release
just release-minor
just release-major
```

**See:** [docs/RELEASE_QUICKSTART.md](./docs/RELEASE_QUICKSTART.md) for quick reference

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- [OpenTelemetry Community](https://opentelemetry.io/) for OBI
- [Anthropic](https://www.anthropic.com/) for Model Context Protocol
- [Grafana Labs](https://grafana.com/) for Beyla (OBI's predecessor)

## 🔗 Links

- [OBI Documentation](https://opentelemetry.io/docs/zero-code/obi/)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [GitHub Issues](https://github.com/raibid-labs/obi-mcp/issues)

## 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/raibid-labs/obi-mcp/issues)
- **Slack**: `#otel-ebpf-instrumentation` on [CNCF Slack](https://slack.cncf.io/)
- **Discussions**: [GitHub Discussions](https://github.com/raibid-labs/obi-mcp/discussions)

---

**Status**: 🚀 Beta - Ready for Testing

**Version**: 0.1.0 - Initial MVP release with 6 tools, 3 resources, and 1 prompt. Production-ready for evaluation and testing.

### Using just Commands

If you have [just](https://github.com/casey/just) installed, you can use convenient shortcuts:

```bash
# Full setup from scratch
just setup

# Start development server
just dev

# Run all tests
just test

# Run tests with coverage
just test-coverage

# Build project
just build

# Run quality checks (typecheck + lint + test)
just check

# Show all available commands
just --list

# Interactive demo
just demo

# Get Claude Desktop setup instructions
just setup-claude
```

---

## 📖 Usage Examples

### Example 1: Deploy and Monitor OBI

```
You: "Deploy OBI with default configuration"
Claude: ✓ Deployed OBI successfully (PID: 12345)

You: "What's the status? Show me detailed metrics"
Claude: [Shows CPU: 2.5%, Memory: 150MB, Uptime: 30s]

You: "Show me the last 50 log lines"
Claude: [Displays recent OBI logs]
```

### Example 2: Configuration Management

```
You: "Show me the current OBI configuration"
Claude: [Displays config JSON]

You: "Update the configuration to enable Kubernetes attributes and restart OBI"
Claude: ✓ Configuration updated and OBI restarted

You: "Verify the new configuration is active"
Claude: [Shows updated config with Kubernetes enabled]
```

### Example 3: Using Resources

```
You: "What resources does the OBI server provide?"
Claude: Three resources available:
  • obi://config/current - Current configuration
  • obi://status/health - Health metrics
  • obi://logs/recent - Recent logs

You: "Show me obi://status/health"
Claude: [Displays real-time health data]
```

### Example 4: Troubleshooting

```
You: "Help me set up OBI locally"
Claude: [Launches setup-obi-local prompt with step-by-step guide]

You: "OBI isn't starting - what should I check?"
Claude: Let me help debug:
1. Checking if OBI is already running... ✓ Not running
2. Checking prerequisites...
3. Attempting to deploy with verbose logging...

You: "Show me error logs from the last hour"
Claude: [Filters and displays error-level logs]
```
