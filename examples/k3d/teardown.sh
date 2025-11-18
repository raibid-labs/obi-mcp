#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-obi-demo}"

echo "=========================================="
echo "  k3d Cluster Teardown"
echo "=========================================="
echo ""

# Check if cluster exists
if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${YELLOW}Cluster '$CLUSTER_NAME' does not exist${NC}"
    exit 0
fi

echo "This will delete the cluster: $CLUSTER_NAME"
echo "All data will be lost!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Teardown cancelled"
    exit 0
fi

echo ""
echo "Deleting cluster '$CLUSTER_NAME'..."
k3d cluster delete "$CLUSTER_NAME"

echo ""
echo -e "${GREEN}=========================================="
echo "  Cluster Deleted Successfully"
echo "==========================================${NC}"
echo ""
echo "To create a new cluster, run: ./setup.sh"
