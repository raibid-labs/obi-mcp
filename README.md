# OBI MCP Server

> Model Context Protocol (MCP) server for OpenTelemetry eBPF Instrumentation (OBI)

Enable AI assistants to deploy, configure, and analyze application observability using OpenTelemetry's zero-code eBPF instrumentation.

## 🌟 Features

- **Zero-Code Instrumentation via AI**: Deploy OBI with natural language commands
- **Process Lifecycle Management**: Start, stop, and monitor OBI processes
- **Configuration Management**: Update OBI configuration through AI assistance
- **Log Analysis**: Query and analyze OBI telemetry output
- **Multi-Platform**: Works with any MCP-compatible AI client (Claude Desktop, Continue, etc.)

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **Linux** kernel 5.8+ (for OBI)
- **OBI binary** installed ([installation guide](https://opentelemetry.io/docs/zero-code/obi/))
- **Root/sudo access** (required by OBI for eBPF)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/obi-mcp-server.git
cd obi-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Running Locally

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Integration with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "obi": {
      "command": "node",
      "args": ["/path/to/obi-mcp-server/dist/index.js"]
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

## 🛠️ Available Tools

### `obi_get_status`

Get the current status of the OBI process.

**Arguments:**
- `verbose` (boolean, optional): Include detailed process information

**Example usage in Claude:**
```
"What's the status of OBI?"
"Check if OBI is running and show me detailed metrics"
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

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and components
- [Development Guide](./docs/DEVELOPMENT.md) - Contributing and development workflow
- [API Reference](./docs/API.md) - Tool and resource specifications
- [Roadmap](./docs/ROADMAP.md) - Future features and timeline

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (requires OBI binary)
npm run test:integration

# Watch mode
npm run test -- --watch
```

## 🏗️ Project Structure

```
obi-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server/
│   │   └── index.ts          # MCP server implementation
│   ├── tools/
│   │   ├── index.ts          # Tool exports
│   │   └── status.ts         # obi_get_status tool (PoC)
│   ├── types/
│   │   ├── obi.ts            # OBI type definitions
│   │   └── mcp.ts            # MCP type definitions
│   └── utils/
│       ├── logger.ts         # Logging utility
│       ├── process.ts        # Process management
│       └── obi-manager.ts    # OBI lifecycle manager
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── examples/
└── package.json
```

## 🗺️ Roadmap

### ✅ MVP (v0.1.0) - Current
- [x] TypeScript project structure
- [x] MCP server with stdio transport
- [x] `obi_get_status` tool (PoC)
- [x] OBI process manager
- [ ] Documentation
- [ ] Unit tests

### 🚧 Phase 1 (v0.2.0) - Next
- [ ] `obi_deploy_local` - Deploy OBI standalone
- [ ] `obi_get_logs` - Fetch OBI logs
- [ ] `obi_update_config` - Modify configuration
- [ ] `obi_stop` - Stop OBI process
- [ ] Integration tests with real OBI

### 🔮 Phase 2 (v0.3.0) - Future
- [ ] Docker deployment support
- [ ] Basic Kubernetes integration
- [ ] Metrics aggregation and analysis
- [ ] OTLP endpoint integration

See [ROADMAP.md](./docs/ROADMAP.md) for detailed timeline.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

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
```

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

## 💬 Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/obi-mcp-server/issues)
- Slack: `#otel-ebpf-instrumentation` on [CNCF Slack](https://slack.cncf.io/)
- Discussions: [GitHub Discussions](https://github.com/yourusername/obi-mcp-server/discussions)

---

**Status**: 🚧 Alpha - Active Development

This is a proof-of-concept implementation. APIs may change. Not recommended for production use yet.
