import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export const setupKubernetesPrompt: Prompt = {
  name: 'setup-obi-kubernetes',
  description: 'Guided setup for deploying OBI to a Kubernetes cluster',
  arguments: [
    {
      name: 'clusterType',
      description: 'Type of Kubernetes cluster (k3d, kind, minikube, eks, gke, aks, custom)',
      required: false,
    },
    {
      name: 'namespace',
      description: 'Target namespace for OBI deployment',
      required: false,
    },
  ],
};

export function getSetupKubernetesTemplate(args?: Record<string, unknown>): string {
  const clusterType = (args?.clusterType as string) || 'unknown';
  const namespace = (args?.namespace as string) || 'observability';

  return `# OBI Kubernetes Deployment Guide

I will help you deploy OpenTelemetry eBPF Instrumentation (OBI) to your Kubernetes cluster.

## Prerequisites

1. kubectl access to your cluster
2. Cluster type: ${clusterType}
3. Target namespace: ${namespace}

## Quick Start

### Step 1: Dry Run
Preview what will be deployed:
\`\`\`
obi_k8s_deploy({ namespace: "${namespace}", dryRun: true })
\`\`\`

### Step 2: Deploy
Deploy OBI to your cluster:
\`\`\`
obi_k8s_deploy({
  namespace: "${namespace}",
  imageTag: "latest",
  otlpEndpoint: "http://your-collector:4317"
})
\`\`\`

### Step 3: Verify
Check deployment status:
\`\`\`
obi_k8s_status({ verbose: true })
\`\`\`

### Step 4: View Logs
Monitor OBI logs:
\`\`\`
obi_k8s_logs({ tail: 50 })
\`\`\`

## Security Notes

OBI requires privileged mode for eBPF:
- Privileged containers (for eBPF loading)
- Host PID namespace (process tracing)
- Host network (network visibility)
- RBAC with least-privilege

## Management

Update configuration:
\`\`\`
obi_k8s_config({ otlpEndpoint: "http://new-endpoint:4317", restart: true })
\`\`\`

Upgrade to new version:
\`\`\`
obi_k8s_upgrade({ imageTag: "v0.2.0", waitForRollout: true })
\`\`\`

Remove OBI:
\`\`\`
obi_k8s_undeploy({ keepConfig: true })
\`\`\`

Ready to deploy? Start with Step 1 (Dry Run) above!
`;
}
