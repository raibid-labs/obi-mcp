/**
 * Setup OBI Local Deployment Prompt
 * Provides guided setup for local OBI deployment
 */

import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const setupLocalPrompt: Prompt = {
  name: 'setup-obi-local',
  description: 'Guided setup for deploying OBI (OpenTelemetry eBPF Instrumentation) locally',
  arguments: [
    {
      name: 'environment',
      description: 'Target environment type (development/production)',
      required: false,
    },
  ],
};

export function getSetupLocalPromptTemplate(args?: { environment?: string }): string {
  const environment = args?.environment || 'development';
  const isProduction = environment === 'production';

  return `# OBI Local Deployment Setup Guide

I'll help you set up OpenTelemetry eBPF Instrumentation (OBI) on your local system.

## Step 1: Prerequisites Check

Before we begin, let's verify your system meets the requirements:

### Required:
- **Linux Kernel**: Version 5.8 or higher (for eBPF support)
  - Check with: \`uname -r\`
  - If below 5.8, you'll need to upgrade your kernel

- **Sudo Access**: Required for eBPF operations
  - Test with: \`sudo -v\`

- **Dependencies**:
  - Docker (if using containerized deployment)
  - curl or wget (for downloading binaries)
  - Basic build tools (if building from source)

### Optional but Recommended:
- **bpftool**: For debugging eBPF programs
  - Install: \`sudo apt install linux-tools-common linux-tools-generic\` (Ubuntu/Debian)

- **OpenTelemetry Collector**: For receiving telemetry data
  - Can be installed separately or alongside OBI

**Action**: Please run the following command to check your system:
\`\`\`bash
uname -r && sudo -v && echo "System check passed"
\`\`\`

---

## Step 2: Configuration Setup

Create an OBI configuration file to define your instrumentation targets.

### Configuration File Location:
- Development: \`./obi-config.yaml\` (current directory)
- Production: \`/etc/obi/config.yaml\` (system-wide)

### Basic Configuration Template:
\`\`\`yaml
# OBI Configuration
version: "1.0"

# Instrumentation targets
instrumentation:
  # Enable auto-instrumentation
  auto_instrument: ${!isProduction}

  # Specific targets (optional)
  targets:
    - name: "my-app"
      type: "process"
      selector:
        command: "node"
        args_pattern: ".*my-app.*"

    - name: "http-traffic"
      type: "network"
      protocol: "http"
      port: 8080

# Export configuration
exporters:
  otlp:
    endpoint: "localhost:4317"
    protocol: "grpc"
    ${isProduction ? 'tls:\n      enabled: true\n      cert_file: "/path/to/cert.pem"' : '# TLS disabled for development'}

# Logging
logging:
  level: "${isProduction ? 'info' : 'debug'}"
  format: "json"
\`\`\`

**Action**: Create your configuration file:
\`\`\`bash
# Create config directory (production)
${isProduction ? 'sudo mkdir -p /etc/obi\nsudo nano /etc/obi/config.yaml' : '# Create in current directory\nnano obi-config.yaml'}
\`\`\`

---

## Step 3: Deployment Options

Choose your deployment method:

### Option A: Binary Deployment (Recommended for ${environment})
1. **Download the latest OBI binary**:
   \`\`\`bash
   curl -Lo obi https://github.com/open-telemetry/opentelemetry-ebpf/releases/latest/download/obi-linux-amd64
   chmod +x obi
   ${isProduction ? 'sudo mv obi /usr/local/bin/' : '# Keep in current directory or move to ~/bin'}
   \`\`\`

2. **Verify installation**:
   \`\`\`bash
   ${isProduction ? 'obi' : './obi'} --version
   \`\`\`

3. **Start OBI**:
   \`\`\`bash
   ${isProduction ? 'sudo obi start --config /etc/obi/config.yaml' : 'sudo ./obi start --config obi-config.yaml'}
   \`\`\`

### Option B: Docker Deployment
1. **Pull OBI Docker image**:
   \`\`\`bash
   docker pull otel/opentelemetry-ebpf-instrumentation:latest
   \`\`\`

2. **Run OBI container** (requires privileged mode for eBPF):
   \`\`\`bash
   docker run -d \\
     --name obi \\
     --privileged \\
     --pid=host \\
     --network=host \\
     -v ${isProduction ? '/etc/obi/config.yaml' : '$(pwd)/obi-config.yaml'}:/etc/obi/config.yaml \\
     -v /sys/kernel/debug:/sys/kernel/debug:ro \\
     otel/opentelemetry-ebpf-instrumentation:latest \\
     --config /etc/obi/config.yaml
   \`\`\`

### Option C: Build from Source
1. **Clone repository**:
   \`\`\`bash
   git clone https://github.com/open-telemetry/opentelemetry-ebpf.git
   cd opentelemetry-ebpf
   \`\`\`

2. **Build**:
   \`\`\`bash
   make build
   \`\`\`

3. **Install**:
   \`\`\`bash
   ${isProduction ? 'sudo make install' : 'make install-local'}
   \`\`\`

---

## Step 4: Verification

After deployment, verify OBI is running correctly:

### Check Process Status:
\`\`\`bash
# If running as binary
ps aux | grep obi

# If running in Docker
docker ps | grep obi
docker logs obi
\`\`\`

### Verify eBPF Programs:
\`\`\`bash
# List loaded eBPF programs
sudo bpftool prog list | grep obi

# Check eBPF maps
sudo bpftool map list
\`\`\`

### Test Instrumentation:
\`\`\`bash
# Use the obi_get_status tool to check deployment
# This should show active instrumentation targets
\`\`\`

### Check Telemetry Export:
- Verify data is reaching your OpenTelemetry Collector
- Check collector logs: \`journalctl -u otel-collector -f\`
- View metrics/traces in your backend (Jaeger, Prometheus, etc.)

---

## Step 5: Troubleshooting

### Common Issues:

#### 1. Permission Denied
**Symptom**: "Operation not permitted" when starting OBI
**Solution**:
- Ensure you're running with sudo
- Check kernel capabilities: \`sudo getcap $(which obi)\`
- Add CAP_SYS_ADMIN if needed: \`sudo setcap cap_sys_admin+ep $(which obi)\`

#### 2. Kernel Version Too Old
**Symptom**: "Kernel version not supported"
**Solution**:
- Upgrade kernel to 5.8+
- Ubuntu/Debian: \`sudo apt install linux-generic-hwe-20.04\`
- Check after upgrade: \`uname -r\`

#### 3. eBPF Programs Not Loading
**Symptom**: No eBPF programs visible in \`bpftool prog list\`
**Solution**:
- Check kernel config: \`zcat /proc/config.gz | grep CONFIG_BPF\`
- Ensure CONFIG_BPF=y and CONFIG_BPF_SYSCALL=y
- Check dmesg for errors: \`sudo dmesg | grep -i bpf\`

#### 4. No Telemetry Data
**Symptom**: OBI running but no data in backend
**Solution**:
- Verify OTLP endpoint is reachable: \`telnet localhost 4317\`
- Check OBI logs for export errors
- Verify configuration file syntax: \`${isProduction ? 'obi' : './obi'} validate --config ${isProduction ? '/etc/obi/config.yaml' : 'obi-config.yaml'}\`
- Test with debug logging: Update config to \`logging.level: debug\`

#### 5. High CPU/Memory Usage
**Symptom**: OBI consuming excessive resources
**Solution**:
- Review instrumentation targets (reduce scope if too broad)
- Adjust sampling rate in configuration
- Check for eBPF program leaks: \`sudo bpftool prog show\`
- Monitor with: \`top -p $(pidof obi)\`

### Debug Mode:
Run OBI with verbose logging:
\`\`\`bash
${isProduction ? 'sudo obi' : 'sudo ./obi'} start --config ${isProduction ? '/etc/obi/config.yaml' : 'obi-config.yaml'} --log-level debug
\`\`\`

### Get Help:
- Check logs: \`journalctl -u obi -f\` (if using systemd)
- OBI documentation: https://opentelemetry.io/docs/
- Report issues: https://github.com/open-telemetry/opentelemetry-ebpf/issues

---

## Next Steps

Once OBI is running successfully:

1. **Configure Instrumentation**: Customize targets for your applications
2. **Set Up Dashboards**: Create visualization in your observability platform
3. **Alert Configuration**: Set up alerts for critical metrics
4. **Performance Tuning**: Optimize sampling and resource usage
5. **Production Hardening** (if applicable):
   - Enable TLS for OTLP export
   - Set up log rotation
   - Configure systemd service for auto-start
   - Implement monitoring and alerting for OBI itself

${isProduction ? `
## Production Checklist:
- [ ] TLS enabled for OTLP export
- [ ] Configuration file secured (600 permissions)
- [ ] Systemd service configured
- [ ] Log rotation set up
- [ ] Resource limits defined
- [ ] Monitoring/alerting configured
- [ ] Backup/recovery plan documented
- [ ] Security audit completed
` : ''}

---

**Ready to begin?** Start with Step 1 and work through each section. Use the MCP tools to check deployment status at any time.
`;
}
