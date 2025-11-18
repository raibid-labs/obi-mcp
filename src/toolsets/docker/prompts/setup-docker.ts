/**
 * Setup OBI Docker Prompt
 * Guided setup for deploying OBI in Docker
 */

import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const setupDockerPrompt: Prompt = {
  name: 'setup-obi-docker',
  description: 'Guided setup for deploying OBI in Docker with best practices',
  arguments: [
    {
      name: 'environment',
      description: 'Deployment environment (development, staging, production)',
      required: false,
    },
    {
      name: 'includeCollector',
      description: 'Include OpenTelemetry Collector in deployment',
      required: false,
    },
  ],
};

/**
 * Generate setup prompt template
 */
export function getSetupDockerTemplate(args?: {
  environment?: string;
  includeCollector?: string;
}): string {
  const environment = args?.environment || 'development';
  const includeCollector = args?.includeCollector === 'true';

  const sections: string[] = [];

  sections.push('# OBI Docker Deployment Setup\n');
  sections.push(`Environment: ${environment}\n`);

  sections.push('## Pre-deployment Checklist\n');
  sections.push('Before deploying OBI in Docker, please verify:\n');

  sections.push('### 1. Docker Installation');
  sections.push('Check if Docker is installed and running:');
  sections.push('```bash');
  sections.push('docker --version');
  sections.push('docker ps');
  sections.push('```\n');

  sections.push('### 2. Docker Permissions');
  sections.push('Ensure your user has Docker access:');
  sections.push('```bash');
  sections.push('# On Linux, add user to docker group:');
  sections.push('sudo usermod -aG docker $USER');
  sections.push('# Then log out and back in');
  sections.push('```\n');

  sections.push('### 3. System Requirements');
  sections.push('OBI requires:');
  sections.push('- Privileged container mode (for eBPF)');
  sections.push('- Host PID namespace access');
  sections.push('- Linux kernel 4.14+ with eBPF support\n');

  sections.push('### 4. Network Configuration');
  sections.push('Choose appropriate network mode:\n');

  sections.push('**Host Network (Recommended for eBPF)**');
  sections.push('- Provides direct access to host network interfaces');
  sections.push('- Required for comprehensive network monitoring');
  sections.push('- Use: `network: "host"`\n');

  sections.push('**Bridge Network**');
  sections.push('- Isolated network for containers');
  sections.push('- Limited visibility into host network');
  sections.push('- Use: `network: "bridge"`\n');

  sections.push('## Deployment Options\n');

  sections.push('### Option 1: Quick Deploy (Standalone Container)');
  sections.push('Use the `obi_docker_deploy` tool for rapid deployment:');
  sections.push('```');
  sections.push('Tool: obi_docker_deploy');
  sections.push('Arguments: {');
  sections.push('  "network": "host",');
  sections.push('  "targetPort": 8080,');
  sections.push('  "otlpEndpoint": "http://localhost:4317"');
  if (environment === 'production') {
    sections.push('  "resources": {');
    sections.push('    "cpus": "2.0",');
    sections.push('    "memory": "2g"');
    sections.push('  }');
  }
  sections.push('}');
  sections.push('```\n');

  sections.push('### Option 2: Docker Compose (Full Stack)');
  sections.push('Generate a complete docker-compose.yml:');
  sections.push('```');
  sections.push('Tool: obi_docker_compose');
  sections.push('Arguments: {');
  sections.push('  "network": "host",');
  sections.push('  "targetPort": 8080,');
  sections.push(`  "includeCollector": ${includeCollector}`);
  if (environment === 'production') {
    sections.push('  "resources": {');
    sections.push('    "cpus": "2.0",');
    sections.push('    "memory": "2g"');
    sections.push('  }');
  }
  sections.push('}');
  sections.push('```\n');

  if (includeCollector) {
    sections.push('## OpenTelemetry Collector Setup\n');
    sections.push('When including the collector:');
    sections.push('1. Save the generated `otel-config.yaml`');
    sections.push('2. Configure exporters for your backend (Jaeger, Prometheus, etc.)');
    sections.push('3. The collector will be available on:');
    sections.push('   - gRPC: `localhost:4317`');
    sections.push('   - HTTP: `localhost:4318`\n');
  }

  sections.push('## Environment-Specific Configuration\n');

  if (environment === 'development') {
    sections.push('### Development Environment');
    sections.push('Recommended settings:');
    sections.push('- Network: `host` (easier debugging)');
    sections.push('- Resources: No strict limits');
    sections.push('- Logging: Verbose mode enabled');
    sections.push('- Restart policy: `unless-stopped`\n');
  } else if (environment === 'staging') {
    sections.push('### Staging Environment');
    sections.push('Recommended settings:');
    sections.push('- Network: `bridge` with defined networks');
    sections.push('- Resources: Moderate limits (1-2 CPUs, 1-2GB RAM)');
    sections.push('- Logging: Standard logging');
    sections.push('- Restart policy: `unless-stopped`');
    sections.push('- Health checks: Enabled\n');
  } else if (environment === 'production') {
    sections.push('### Production Environment');
    sections.push('Recommended settings:');
    sections.push('- Network: `host` for full monitoring coverage');
    sections.push('- Resources: Defined limits (2+ CPUs, 2+ GB RAM)');
    sections.push('- Logging: Error and warning levels only');
    sections.push('- Restart policy: `always`');
    sections.push('- Health checks: Mandatory');
    sections.push('- Monitoring: Prometheus metrics enabled\n');
  }

  sections.push('## Post-Deployment Verification\n');
  sections.push('After deployment, verify the installation:\n');

  sections.push('### 1. Check Container Status');
  sections.push('```');
  sections.push('Tool: obi_docker_status');
  sections.push('Arguments: { "verbose": true }');
  sections.push('```\n');

  sections.push('### 2. Review Logs');
  sections.push('```');
  sections.push('Tool: obi_docker_logs');
  sections.push('Arguments: { "lines": 50 }');
  sections.push('```\n');

  sections.push('### 3. Test Instrumentation');
  sections.push('Generate test traffic to verify OBI is capturing data:');
  sections.push('```bash');
  sections.push('# Example: Make HTTP requests to monitored service');
  sections.push('curl http://localhost:8080/health');
  sections.push('```\n');

  sections.push('## Troubleshooting\n');

  sections.push('### Container Won\'t Start');
  sections.push('Common issues:');
  sections.push('1. **Insufficient Permissions**: Run `docker ps` to verify Docker access');
  sections.push('2. **Port Conflicts**: Check if target ports are already in use');
  sections.push('3. **eBPF Support**: Verify kernel version: `uname -r` (requires 4.14+)');
  sections.push('4. **Privileged Mode**: Ensure Docker allows privileged containers\n');

  sections.push('### No Data Being Captured');
  sections.push('Verify:');
  sections.push('1. **Target Port**: Ensure `targetPort` matches your application');
  sections.push('2. **Network Mode**: Use `host` network for best visibility');
  sections.push('3. **OTLP Endpoint**: Verify collector is reachable');
  sections.push('4. **Container Logs**: Check for eBPF attachment errors\n');

  sections.push('### High Resource Usage');
  sections.push('Optimize:');
  sections.push('1. Set explicit resource limits using `resources` parameter');
  sections.push('2. Reduce sampling rate in OBI configuration');
  sections.push('3. Filter traffic to specific ports or protocols');
  sections.push('4. Monitor with: `docker stats obi`\n');

  sections.push('## Security Considerations\n');

  if (environment === 'production') {
    sections.push('For production deployments:');
    sections.push('1. **Minimize Privileges**: Use least privilege principle');
    sections.push('2. **Network Isolation**: Consider network policies');
    sections.push('3. **Secret Management**: Use Docker secrets for sensitive configs');
    sections.push('4. **Image Security**: Scan images regularly for vulnerabilities');
    sections.push('5. **Access Control**: Restrict Docker API access\n');
  } else {
    sections.push('Security best practices:');
    sections.push('1. Keep Docker and OBI images updated');
    sections.push('2. Use read-only filesystem where possible');
    sections.push('3. Implement network segmentation');
    sections.push('4. Enable Docker Content Trust\n');
  }

  sections.push('## Next Steps\n');
  sections.push('1. Choose deployment option (standalone or compose)');
  sections.push('2. Deploy using appropriate MCP tool');
  sections.push('3. Verify deployment with status checks');
  sections.push('4. Configure monitoring and alerting');
  sections.push('5. Document configuration for team reference\n');

  sections.push('## Additional Resources\n');
  sections.push('- OBI Documentation: https://github.com/open-telemetry/opentelemetry-ebpf');
  sections.push('- Docker Documentation: https://docs.docker.com/');
  sections.push('- OpenTelemetry: https://opentelemetry.io/');
  sections.push('- eBPF Guide: https://ebpf.io/');

  return sections.join('\n');
}
