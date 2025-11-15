# OBI MCP Server - Justfile
# Quick command reference for building, testing, and running the server

# Default recipe (shows help)
default:
    @just --list

# === Build Commands ===

# Build the TypeScript project
build:
    @echo "🔨 Building project..."
    npm run build
    @echo "✅ Build complete - artifacts in dist/"

# Build and watch for changes
watch:
    @echo "👀 Watching for changes..."
    npm run watch

# Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf dist/
    @echo "✅ Clean complete"

# Clean everything including node_modules
clean-all: clean
    @echo "🧹 Removing node_modules..."
    rm -rf node_modules/
    @echo "✅ Full clean complete"

# Install dependencies
install:
    @echo "📦 Installing dependencies..."
    npm install
    @echo "✅ Dependencies installed"

# === Test Commands ===

# Run all tests
test:
    @echo "🧪 Running all tests..."
    npm test

# Run tests with coverage
test-coverage:
    @echo "🧪 Running tests with coverage..."
    npm test -- --coverage
    @echo "📊 Coverage report available in coverage/"

# Run unit tests only
test-unit:
    @echo "🧪 Running unit tests..."
    npm run test:unit

# Run integration tests only
test-integration:
    @echo "🧪 Running integration tests..."
    npm run test:integration

# Run E2E tests only
test-e2e:
    @echo "🧪 Running E2E tests..."
    npm run test:e2e

# Run E2E tests with real OBI binary
test-e2e-real OBI_PATH:
    @echo "🧪 Running E2E tests with real OBI..."
    OBI_BINARY_PATH={{OBI_PATH}} npm run test:e2e

# Watch mode for tests
test-watch:
    @echo "👀 Running tests in watch mode..."
    npm test -- --watch

# === Quality Commands ===

# Run linter
lint:
    @echo "🔍 Running linter..."
    npm run lint

# Run linter and auto-fix issues
lint-fix:
    @echo "🔧 Running linter with auto-fix..."
    npm run lint:fix

# Format code with prettier
format:
    @echo "✨ Formatting code..."
    npm run format
    @echo "✅ Code formatted"

# Type check without building
typecheck:
    @echo "🔍 Type checking..."
    npm run typecheck
    @echo "✅ Type check passed"

# Run all quality checks
check: typecheck lint test
    @echo "✅ All quality checks passed!"

# === Development Commands ===

# Run in development mode with auto-reload
dev:
    @echo "🚀 Starting development server..."
    npm run dev

# Start the server (production mode)
start:
    @echo "🚀 Starting OBI MCP Server..."
    npm start

# === Demo Commands ===

# Show OBI MCP Server info
info:
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo "  OBI MCP Server"
    @echo "  Version: $(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo ""
    @echo "📦 Tools Available:"
    @echo "  • obi_get_status      - Get OBI process status"
    @echo "  • obi_deploy_local    - Deploy OBI locally"
    @echo "  • obi_get_config      - Get current configuration"
    @echo "  • obi_update_config   - Update configuration"
    @echo "  • obi_get_logs        - Fetch OBI logs"
    @echo "  • obi_stop            - Stop OBI process"
    @echo ""
    @echo "🔗 Resources Available:"
    @echo "  • obi://config/current  - Current config"
    @echo "  • obi://status/health   - Health metrics"
    @echo "  • obi://logs/recent     - Recent logs"
    @echo ""
    @echo "💡 Prompts Available:"
    @echo "  • setup-obi-local       - Guided setup"
    @echo ""
    @echo "Run 'just demo' for an interactive demo"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Interactive demo showing server capabilities
demo:
    @echo "🎬 OBI MCP Server Demo"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo ""
    @echo "1️⃣  Building project..."
    @just build
    @echo ""
    @echo "2️⃣  Running tests (unit + integration)..."
    @npm run test:unit -- --run && npm run test:integration -- --run
    @echo ""
    @echo "✅ All core tests passed! (E2E tests have 3 known issues - see E2E_TEST_REPORT.md)"
    @echo ""
    @echo "3️⃣  Server is ready! To use with Claude Desktop:"
    @echo ""
    @echo "Add to claude_desktop_config.json:"
    @echo '{'
    @echo '  "mcpServers": {'
    @echo '    "obi": {'
    @echo '      "command": "node",'
    @echo '      "args": ["$(pwd)/dist/index.js"]'
    @echo '    }'
    @echo '  }'
    @echo '}'
    @echo ""
    @echo "✅ Demo complete! Ready for Claude Desktop integration"

# === Release Commands ===

# Create a patch release (0.1.0 -> 0.1.1)
release:
    @echo "📦 Creating patch release..."
    npm run release

# Create a minor release (0.1.0 -> 0.2.0)
release-minor:
    @echo "📦 Creating minor release..."
    npm run release:minor

# Create a major release (0.1.0 -> 1.0.0)
release-major:
    @echo "📦 Creating major release..."
    npm run release:major

# Create an alpha release (0.1.0 -> 0.1.1-alpha.0)
release-alpha:
    @echo "📦 Creating alpha release..."
    npm run release:alpha

# Dry run release (no git changes)
release-dry:
    @echo "📦 Dry run release (no changes)..."
    npm run release:dry

# === Documentation Commands ===

# Generate API documentation (if using TypeDoc)
docs:
    @echo "📚 Documentation available in docs/"
    @echo "  • docs/API.md           - API Reference"
    @echo "  • docs/ARCHITECTURE.md  - Architecture"
    @echo "  • docs/QUICKSTART.md    - Quick Start"
    @echo "  • docs/RELEASING.md     - Release Guide"

# Open documentation in browser (if available)
docs-open:
    @echo "📖 Opening documentation..."
    @open docs/QUICKSTART.md || xdg-open docs/QUICKSTART.md || echo "Please open docs/ manually"

# === Utility Commands ===

# Show project stats
stats:
    @echo "📊 Project Statistics"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo "Source files:       $(find src -name '*.ts' | wc -l)"
    @echo "Test files:         $(find tests -name '*.ts' | wc -l)"
    @echo "Total TypeScript:   $(find src tests -name '*.ts' | wc -l)"
    @echo "Lines of code:      $(find src -name '*.ts' -exec cat {} \; | wc -l)"
    @echo "Lines of tests:     $(find tests -name '*.ts' -exec cat {} \; | wc -l)"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if OBI binary is available
check-obi:
    @echo "🔍 Checking for OBI binary..."
    @which obi > /dev/null 2>&1 && echo "✅ OBI found: $(which obi)" || echo "❌ OBI not found in PATH"

# Setup Claude Desktop config (interactive)
setup-claude:
    @echo "🔧 Claude Desktop Setup"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo ""
    @echo "Config file location (macOS):"
    @echo "  ~/Library/Application Support/Claude/claude_desktop_config.json"
    @echo ""
    @echo "Config file location (Windows):"
    @echo "  %APPDATA%\\Claude\\claude_desktop_config.json"
    @echo ""
    @echo "Config file location (Linux):"
    @echo "  ~/.config/Claude/claude_desktop_config.json"
    @echo ""
    @echo "Add this configuration:"
    @echo ""
    @echo '{'
    @echo '  "mcpServers": {'
    @echo '    "obi": {'
    @echo '      "command": "node",'
    @echo '      "args": ["'$(pwd)'/dist/index.js"]'
    @echo '    }'
    @echo '  }'
    @echo '}'
    @echo ""
    @echo "Or use npx after publishing:"
    @echo ""
    @echo '{'
    @echo '  "mcpServers": {'
    @echo '    "obi": {'
    @echo '      "command": "npx",'
    @echo '      "args": ["obi-mcp-server"]'
    @echo '    }'
    @echo '  }'
    @echo '}'

# Full setup from scratch
setup: install build test
    @echo ""
    @echo "✅ Setup complete!"
    @echo ""
    @echo "Next steps:"
    @echo "  1. Run 'just setup-claude' for Claude Desktop config"
    @echo "  2. Run 'just dev' to start development server"
    @echo "  3. Run 'just demo' to see what's possible"

# === CI/CD Simulation ===

# Simulate CI pipeline locally
ci: clean install typecheck lint test build
    @echo ""
    @echo "✅ CI simulation passed!"
    @echo "All checks completed successfully"

# Pre-commit checks
pre-commit: format typecheck lint test-unit
    @echo "✅ Pre-commit checks passed!"

# === Help ===

# Show detailed help
help:
    @echo "OBI MCP Server - Command Reference"
    @echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    @echo ""
    @echo "Quick Start:"
    @echo "  just setup              # Full setup from scratch"
    @echo "  just dev                # Start development server"
    @echo "  just test               # Run tests"
    @echo ""
    @echo "Common Commands:"
    @echo "  just build              # Build project"
    @echo "  just test               # Run all tests"
    @echo "  just check              # Run all quality checks"
    @echo "  just demo               # Interactive demo"
    @echo ""
    @echo "Testing:"
    @echo "  just test-unit          # Unit tests only"
    @echo "  just test-integration   # Integration tests only"
    @echo "  just test-e2e           # E2E tests only"
    @echo "  just test-coverage      # With coverage report"
    @echo ""
    @echo "Quality:"
    @echo "  just lint               # Run linter"
    @echo "  just format             # Format code"
    @echo "  just typecheck          # Type checking"
    @echo ""
    @echo "Release:"
    @echo "  just release            # Patch release"
    @echo "  just release-minor      # Minor release"
    @echo "  just release-major      # Major release"
    @echo ""
    @echo "For full list: just --list"
    @echo "For project info: just info"
