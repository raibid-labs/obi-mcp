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
echo "  kind Cluster Setup for OBI"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    echo "Install with:"
    echo "  curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64"
    echo "  chmod +x ./kind"
    echo "  sudo mv ./kind /usr/local/bin/kind"
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
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${YELLOW}Warning: Cluster '$CLUSTER_NAME' already exists${NC}"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing cluster..."
        kind delete cluster --name "$CLUSTER_NAME"
    else
        echo "Using existing cluster"
        kubectl cluster-info --context "kind-$CLUSTER_NAME"
        exit 0
    fi
fi

# Create cluster
echo "Creating kind cluster '$CLUSTER_NAME'..."
echo "  - 1 control-plane node"
echo "  - 2 worker nodes"
echo "  - OTLP ports: 4317 (gRPC), 4318 (HTTP)"
echo ""
echo "This may take 2-3 minutes..."
echo ""

kind create cluster --name "$CLUSTER_NAME" --config cluster-config.yaml

echo ""
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=180s

echo ""
echo "Creating namespace '$NAMESPACE'..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo -e "${GREEN}=========================================="
echo "  Cluster Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Context: kind-$CLUSTER_NAME"
echo ""
echo "Nodes:"
kubectl get nodes -o wide
echo ""
echo "Namespace: $NAMESPACE"
echo ""
echo -e "${GREEN}Next step:${NC} Run ./deploy-obi.sh to deploy OBI"
