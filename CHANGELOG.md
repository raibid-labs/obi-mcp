# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes at this time.

---

## [0.1.0] - 2025-11-14

### Added

#### Core Features
- **6 MCP Tools** for comprehensive OBI lifecycle management:
  - `obi_get_status` - Get OBI process status with optional detailed metrics
  - `obi_deploy_local` - Deploy OBI locally in standalone mode
  - `obi_get_config` - Retrieve current OBI configuration
  - `obi_update_config` - Update configuration with validation and optional restart
  - `obi_get_logs` - Fetch OBI logs with filtering by level and line count
  - `obi_stop` - Stop OBI process (graceful or forced)

- **3 MCP Resources** for real-time data access:
  - `obi://config/current` - Current configuration in JSON format
  - `obi://status/health` - Process health metrics and status
  - `obi://logs/recent` - Last 100 lines of logs

- **1 MCP Prompt** for guided workflows:
  - `setup-obi-local` - Step-by-step deployment guide (development/production)

#### Infrastructure
- Initial TypeScript project structure with full type safety
- MCP server implementation with stdio transport
- Comprehensive error handling and validation
- Process lifecycle management (spawn, monitor, terminate)
- Configuration management (read, write, merge, validate)
- Log streaming and filtering capabilities
- Logging infrastructure with winston
- Process management utilities
- Type definitions for OBI and MCP

#### Testing
- Comprehensive test suite with **270 tests**
- **99.81% code coverage**
- Unit tests for all tools, resources, and utilities
- Integration tests for MCP protocol compliance
- End-to-end tests for complete workflows
- Test utilities and helpers for common scenarios

#### Documentation
- Complete README with feature overview and quick start
- Comprehensive API reference (docs/API.md) with all tools, resources, and prompts
- Quick start guide (docs/QUICKSTART.md)
- Project roadmap (docs/ROADMAP.md)
- Project summary (docs/PROJECT_SUMMARY.md)
- Changelog with detailed release notes

#### Developer Experience
- ESLint configuration for code quality
- Prettier formatting for consistent style
- TypeScript strict mode for type safety
- Watch mode for development
- Multiple test modes (unit, integration, e2e, watch)
- Structured error responses

#### CI/CD
- Complete release automation system
- GitHub Actions workflow for automated releases
- Changelog generation from git commits
- npm publishing configuration
- Release documentation and process guide
- Version bump scripts (patch, minor, major, alpha, beta)
- Automated prerelease handling
- Code coverage reporting with Codecov

### Features in Detail

#### Tools
All 6 tools provide comprehensive OBI management capabilities with proper error handling, input validation, and formatted output.

#### Resources
Resources provide read-only access to live OBI state in both JSON and text formats.

#### Prompts
The setup prompt provides environment-aware deployment guidance with step-by-step instructions, troubleshooting, and production checklists.

### Technical Specifications
- **Node.js**: >= 18.0.0
- **TypeScript**: 5.7.2
- **MCP SDK**: 1.0.4
- **Test Framework**: Vitest 2.1.8
- **Validation**: Zod 3.23.8
- **Logging**: Winston 3.17.0

### Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `winston` - Structured logging
- `yaml` - YAML parsing for configs
- `zod` - Runtime type validation

### Development Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Test framework with coverage
- `eslint` - Code linting
- `prettier` - Code formatting
- `tsx` - TypeScript execution

---

## Version History

### Released
- **v0.1.0** (2025-11-14) - Initial MVP Release

### Planned
- **v0.2.0** - Enhanced Features (Docker, Kubernetes, Metrics)
- **v0.3.0** - Advanced Capabilities (Multi-instance, Streaming, Dashboards)
- **v1.0.0** - Production Release (Stable API, Full Documentation)

See [ROADMAP.md](./docs/ROADMAP.md) for detailed feature timeline.

---

## Migration Guides

### From Pre-release to v0.1.0

This is the initial release. No migration needed.

---

## Breaking Changes

None - Initial release.

---

## Deprecations

None - Initial release.

---

## Security

### v0.1.0 Security Considerations

- **Sudo Required**: OBI requires root/sudo access for eBPF operations
- **File Permissions**: Configuration files should have restricted permissions (600)
- **Process Management**: Care must be taken when stopping processes
- **Configuration Validation**: All configs are validated before application
- **Log Access**: Logs may contain sensitive process information

### Recommendations

1. Run OBI MCP Server with minimum required privileges
2. Secure configuration files with appropriate permissions
3. Review logs before sharing to avoid exposing sensitive data
4. Use TLS for OTLP endpoints in production
5. Regularly update dependencies for security patches

---

## Notes

### Known Limitations (v0.1.0)

1. **Single Instance**: Currently supports managing one OBI instance at a time
2. **Local Only**: No remote OBI management support yet
3. **Linux Only**: Requires Linux kernel 5.8+ for eBPF
4. **No Metrics Aggregation**: Raw log access only, no built-in analytics
5. **Configuration Format**: Supports partial schema, not all OBI options
6. **No Auto-Discovery**: Manual configuration required

### Performance Characteristics

- **Startup Time**: < 1 second for MCP server initialization
- **Tool Response Time**: < 100ms for status checks
- **Log Retrieval**: O(n) where n = number of lines requested
- **Memory Footprint**: ~50MB for MCP server, variable for OBI
- **Test Suite**: Runs in ~4 seconds with 270 tests

### Testing Coverage Breakdown

Overall: **99.81%** statements, **96.49%** branches, **100%** functions

All major components have 100% coverage including:
- All 6 tools (status, deploy-local, get-config, update-config, get-logs, stop)
- All 3 resource handlers
- Prompt templates
- MCP server implementation
- Type definitions

Only minor edge cases in utilities have <100% coverage.

---

## Contributors

- Initial implementation by Raibid Labs team
- Built on OpenTelemetry and Anthropic MCP foundations

---

## Links

- [GitHub Repository](https://github.com/raibid-labs/obi-mcp)
- [Issue Tracker](https://github.com/raibid-labs/obi-mcp/issues)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/zero-code/obi/)

---

[Unreleased]: https://github.com/raibid-labs/obi-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/raibid-labs/obi-mcp/releases/tag/v0.1.0
