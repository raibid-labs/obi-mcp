#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROFILE="${MINIKUBE_PROFILE:-obi-demo}"
DRIVER="${MINIKUBE_DRIVER:-docker}"
MEMORY="${MINIKUBE_MEMORY:-4096}"
CPUS="${MINIKUBE_CPUS:-2}"
DISK="${MINIKUBE_DISK:-20g}"
NAMESPACE="${OBI_NAMESPACE:-observability}"

echo "=========================================="
echo "  minikube Cluster Setup for OBI"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v minikube &> /dev/null; then
    echo -e "${RED}Error: minikube is not installed${NC}"
    echo "Install from: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    echo "Install from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check driver-specific requirements
if [ "$DRIVER" == "docker" ] && ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed or not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites check passed"
echo ""

# Check if profile already exists
if minikube profile list 2>/dev/null | grep -q "$PROFILE"; then
    echo -e "${YELLOW}Warning: Profile '$PROFILE' already exists${NC}"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing profile..."
        minikube delete --profile="$PROFILE"
    else
        echo "Using existing profile"
        minikube profile "$PROFILE"
        kubectl config use-context "$PROFILE"
        exit 0
    fi
fi

# Create cluster
echo "Creating minikube cluster '$PROFILE'..."
echo "  Driver: $DRIVER"
echo "  Memory: ${MEMORY}MB"
echo "  CPUs: $CPUS"
echo "  Disk: $DISK"
echo ""
echo "This may take 3-5 minutes..."
echo ""

minikube start \
  --profile="$PROFILE" \
  --driver="$DRIVER" \
  --memory="$MEMORY" \
  --cpus="$CPUS" \
  --disk-size="$DISK" \
  --kubernetes-version=stable

echo ""
echo "Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=180s

# Enable useful addons
echo ""
echo "Enabling useful addons..."
minikube addons enable metrics-server --profile="$PROFILE"

echo ""
echo "Creating namespace '$NAMESPACE'..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo ""
echo -e "${GREEN}=========================================="
echo "  Cluster Setup Complete!"
echo "==========================================${NC}"
echo ""
echo "Profile: $PROFILE"
echo "Driver: $DRIVER"
echo "Context: $PROFILE"
echo ""
echo "Nodes:"
kubectl get nodes -o wide
echo ""
echo "Namespace: $NAMESPACE"
echo ""
echo "Useful commands:"
echo "  - Open dashboard: minikube dashboard --profile=$PROFILE"
echo "  - SSH to node: minikube ssh --profile=$PROFILE"
echo "  - Get cluster IP: minikube ip --profile=$PROFILE"
echo ""
echo -e "${GREEN}Next step:${NC} Run ./deploy-obi.sh to deploy OBI"
