#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-obi-demo}"
NAMESPACE="${OBI_NAMESPACE:-observability}"

echo "=========================================="
echo "  k3d Cluster Setup for OBI"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v k3d &> /dev/null; then
    echo -e "${RED}Error: k3d is not installed${NC}"
    echo "Install with: curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    echo "Install from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed or not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites check passed"
echo ""

# Check if cluster already exists
if k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${YELLOW}Warning: Cluster '$CLUSTER_NAME' already exists${NC}"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing cluster..."
        k3d cluster delete "$CLUSTER_NAME"
    else
        echo "Using existing cluster"
        kubectl config use-context "k3d-$CLUSTER_NAME"
        exit 0
    fi
fi

# Create cluster
echo "Creating k3d cluster '$CLUSTER_NAME'..."
echo "  - 1 server node"
echo "  - 2 agent nodes"
echo "  - OTLP ports: 4317 (gRPC), 4318 (HTTP)"
echo ""

k3d cluster create "$CLUSTER_NAME" --config cluster-config.yaml

echo ""
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=120s

echo ""
echo "Creating namespace '$NAMESPACE'..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo -e "${GREEN}=========================================="
echo "  Cluster Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Nodes:"
kubectl get nodes -o wide
echo ""
echo "Namespace: $NAMESPACE"
echo ""
echo -e "${GREEN}Next step:${NC} Run ./deploy-obi.sh to deploy OBI"
