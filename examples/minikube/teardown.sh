#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROFILE="${MINIKUBE_PROFILE:-obi-demo}"

echo "=========================================="
echo "  minikube Cluster Teardown"
echo "=========================================="
echo ""

# Check if profile exists
if ! minikube profile list 2>/dev/null | grep -q "$PROFILE"; then
    echo -e "${YELLOW}Profile '$PROFILE' does not exist${NC}"
    exit 0
fi

echo "This will delete the minikube profile: $PROFILE"
echo "All data will be lost!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Teardown cancelled"
    exit 0
fi

echo ""
echo "Deleting minikube profile '$PROFILE'..."
minikube delete --profile="$PROFILE"

echo ""
echo -e "${GREEN}=========================================="
echo "  Cluster Deleted Successfully"
echo "==========================================${NC}"
echo ""
echo "To create a new cluster, run: ./setup.sh"
