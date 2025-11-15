# Quick Start Guide

Get the OBI MCP Server up and running in 5 minutes.

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- ✅ **npm** (comes with Node.js)
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **Linux** (for OBI support - WSL2 works on Windows)

Optional (for full functionality):
- OBI binary installed ([Guide](https://opentelemetry.io/docs/zero-code/obi/))

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/obi-mcp-server.git
cd obi-mcp-server
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- MCP SDK
- TypeScript
- Winston (logging)
- Zod (validation)
- Vitest (testing)
- And more...

### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

This starts the server with hot-reloading using `tsx`.

### Production Mode

```bash
npm start
```

This runs the compiled JavaScript from `dist/`.

## Integration with Claude Desktop

### macOS

1. **Open Claude Desktop config**:
   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Add OBI MCP Server**:
   ```json
   {
     "mcpServers": {
       "obi": {
         "command": "node",
         "args": ["/absolute/path/to/obi-mcp-server/dist/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Windows

1. **Open config**:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. **Add server** (same as macOS)

3. **Restart Claude Desktop**

### Linux

1. **Open config**:
   ```bash
   code ~/.config/Claude/claude_desktop_config.json
   ```

2. **Add server** (same as macOS)

3. **Restart Claude Desktop**

## Testing the Integration

Once Claude Desktop is restarted:

1. **Open Claude Desktop**

2. **Check MCP Status**:
   - Look for the MCP icon in Claude
   - OBI server should be listed

3. **Try a Command**:
   ```
   User: "What's the status of OBI?"
   Claude: [Calls obi_get_status tool]
   ```

## Development Workflow

### Watch Mode (recommended)

Terminal 1 - Watch TypeScript compilation:
```bash
npm run watch
```

Terminal 2 - Run the server:
```bash
npm start
```

Every time you save a `.ts` file, it auto-compiles!

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# Specific file
npm test tests/unit/status-tool.test.ts
```

### Code Quality

```bash
# Lint
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

## Project Structure (Abbreviated)

```
obi-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server/index.ts       # MCP server
│   ├── tools/status.ts       # obi_get_status tool
│   ├── types/                # TypeScript types
│   └── utils/                # Utilities
├── tests/
│   └── unit/                 # Unit tests
├── examples/                 # Usage examples
├── docs/                     # Documentation
└── package.json              # Dependencies
```

## Available Tools (Current)

### `obi_get_status`

Check if OBI is running and get process info.

**Usage in Claude**:
```
"Is OBI running?"
"Check OBI status with details"
```

**Returns**:
```
=== OBI Status ===
Status: running
PID: 12345
Uptime: 3600s

--- Details ---
CPU Usage: 2.5%
Memory Usage: 150.32 MB
Config Path: /home/user/.obi/obi-config.yml
```

## Troubleshooting

### "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Permission denied" when running

```bash
# Make entry point executable
chmod +x dist/index.js
```

### TypeScript compilation errors

```bash
# Clean build
rm -rf dist
npm run build
```

### Claude Desktop not detecting server

1. Check config file path is correct
2. Use **absolute** paths, not relative
3. Restart Claude Desktop completely
4. Check logs in Claude Desktop

### Server crashes on startup

```bash
# Check logs
LOG_LEVEL=debug npm start

# Verify Node.js version
node --version  # Should be >= 18.0.0
```

## Environment Variables

Configure via environment variables:

```bash
# Set log level
export LOG_LEVEL=debug

# Set log file
export LOG_FILE=/path/to/obi-mcp-server.log

# Run server
npm start
```

Available log levels:
- `error` - Errors only
- `warn` - Warnings and errors
- `info` - Info, warnings, errors (default)
- `debug` - Everything

## Next Steps

Now that you have the server running:

1. **Read the docs**: [README.md](../README.md)
2. **Check the roadmap**: [ROADMAP.md](./ROADMAP.md)
3. **Try examples**: [examples/usage-examples.md](../examples/usage-examples.md)
4. **Contribute**: [CONTRIBUTING.md](../CONTRIBUTING.md)

## Common Commands Reference

```bash
# Development
npm run dev          # Dev mode with auto-reload
npm run watch        # Watch TypeScript compilation
npm run build        # Build for production

# Testing
npm test            # Run all tests
npm run test:unit   # Unit tests only
npm run test:integration  # Integration tests

# Code Quality
npm run lint        # Run linter
npm run lint:fix    # Auto-fix issues
npm run format      # Format code
npm run typecheck   # Type checking

# Production
npm start           # Run compiled server
```

## Getting Help

- **Documentation**: [docs/](.)
- **Examples**: [examples/](../examples/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/obi-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/obi-mcp-server/discussions)

## What's Next?

The current PoC includes only `obi_get_status`. The MVP (v0.1.0) will add:

- `obi_deploy_local` - Deploy OBI
- `obi_get_logs` - View logs
- `obi_update_config` - Modify config
- `obi_stop` - Stop OBI

See [ROADMAP.md](./ROADMAP.md) for full timeline.

---

Happy hacking! 🚀
