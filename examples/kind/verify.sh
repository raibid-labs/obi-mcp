#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${OBI_NAMESPACE:-observability}"

echo "=========================================="
echo "  OBI Deployment Verification"
echo "=========================================="
echo ""

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Error: Namespace '$NAMESPACE' does not exist${NC}"
    echo "Run ./setup.sh and ./deploy-obi.sh first"
    exit 1
fi

# Check DaemonSet
echo -e "${BLUE}=== DaemonSet Status ===${NC}"
kubectl get daemonset -n "$NAMESPACE" obi 2>/dev/null || {
    echo -e "${RED}Error: OBI DaemonSet not found${NC}"
    echo "Run ./deploy-obi.sh to deploy OBI"
    exit 1
}

echo ""
echo -e "${BLUE}=== Pod Status ===${NC}"
kubectl get pods -n "$NAMESPACE" -l app=obi -o wide

echo ""
echo -e "${BLUE}=== Node Coverage ===${NC}"
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
WORKER_NODES=$(kubectl get nodes --no-headers -l '!node-role.kubernetes.io/control-plane' | wc -l)
OBI_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=obi --no-headers 2>/dev/null | wc -l)

echo "Total nodes in cluster: $TOTAL_NODES"
echo "Worker nodes: $WORKER_NODES"
echo "OBI pods running: $OBI_PODS"

if [ "$OBI_PODS" -eq "$WORKER_NODES" ]; then
    echo -e "${GREEN}✓ OBI running on all worker nodes${NC}"
else
    echo -e "${YELLOW}⚠ OBI not running on all worker nodes${NC}"
fi

# Check pod health
echo ""
echo -e "${BLUE}=== Pod Health Check ===${NC}"

PODS=$(kubectl get pods -n "$NAMESPACE" -l app=obi -o jsonpath='{.items[*].metadata.name}')

if [ -z "$PODS" ]; then
    echo -e "${YELLOW}Warning: No OBI pods found${NC}"
else
    for POD in $PODS; do
        STATUS=$(kubectl get pod -n "$NAMESPACE" "$POD" -o jsonpath='{.status.phase}')
        READY=$(kubectl get pod -n "$NAMESPACE" "$POD" -o jsonpath='{.status.containerStatuses[0].ready}')
        NODE=$(kubectl get pod -n "$NAMESPACE" "$POD" -o jsonpath='{.spec.nodeName}')

        if [ "$STATUS" == "Running" ] && [ "$READY" == "true" ]; then
            echo -e "${GREEN}✓${NC} $POD (on $NODE): $STATUS, Ready"
        else
            echo -e "${RED}✗${NC} $POD (on $NODE): $STATUS, Ready=$READY"
        fi
    done
fi

# Check recent logs
echo ""
echo -e "${BLUE}=== Recent Logs (last 20 lines) ===${NC}"
echo ""

if [ -z "$PODS" ]; then
    echo -e "${YELLOW}No pods available to show logs${NC}"
else
    # Show logs from first pod
    FIRST_POD=$(echo $PODS | awk '{print $1}')
    echo "Logs from $FIRST_POD:"
    echo ""
    kubectl logs -n "$NAMESPACE" "$FIRST_POD" --tail=20 2>/dev/null || {
        echo -e "${YELLOW}Could not retrieve logs (pod may still be starting)${NC}"
    }
fi

# Check for common issues
echo ""
echo -e "${BLUE}=== Common Issues Check ===${NC}"

# Check for CrashLoopBackOff
CRASHES=$(kubectl get pods -n "$NAMESPACE" -l app=obi -o jsonpath='{.items[?(@.status.containerStatuses[0].state.waiting.reason=="CrashLoopBackOff")].metadata.name}')
if [ -n "$CRASHES" ]; then
    echo -e "${RED}✗ Pods in CrashLoopBackOff: $CRASHES${NC}"
    echo "  Check logs: kubectl logs -n $NAMESPACE $CRASHES"
else
    echo -e "${GREEN}✓${NC} No pods in CrashLoopBackOff"
fi

# Check for ImagePullBackOff
IMAGE_ISSUES=$(kubectl get pods -n "$NAMESPACE" -l app=obi -o jsonpath='{.items[?(@.status.containerStatuses[0].state.waiting.reason=="ImagePullBackOff")].metadata.name}')
if [ -n "$IMAGE_ISSUES" ]; then
    echo -e "${RED}✗ Pods with image pull issues: $IMAGE_ISSUES${NC}"
    echo "  Check image: kubectl describe pod -n $NAMESPACE $IMAGE_ISSUES"
else
    echo -e "${GREEN}✓${NC} No image pull issues"
fi

# Check privileged mode
echo ""
PRIVILEGED=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.spec.template.spec.containers[0].securityContext.privileged}')
if [ "$PRIVILEGED" == "true" ]; then
    echo -e "${GREEN}✓${NC} Privileged mode enabled (required for eBPF)"
else
    echo -e "${RED}✗ Privileged mode not enabled (eBPF will not work)${NC}"
fi

# Check RBAC
echo ""
SA_EXISTS=$(kubectl get sa -n "$NAMESPACE" obi 2>/dev/null && echo "true" || echo "false")
if [ "$SA_EXISTS" == "true" ]; then
    echo -e "${GREEN}✓${NC} ServiceAccount 'obi' exists"
else
    echo -e "${RED}✗ ServiceAccount 'obi' missing${NC}"
fi

CR_EXISTS=$(kubectl get clusterrole obi 2>/dev/null && echo "true" || echo "false")
if [ "$CR_EXISTS" == "true" ]; then
    echo -e "${GREEN}✓${NC} ClusterRole 'obi' exists"
else
    echo -e "${RED}✗ ClusterRole 'obi' missing${NC}"
fi

CRB_EXISTS=$(kubectl get clusterrolebinding obi 2>/dev/null && echo "true" || echo "false")
if [ "$CRB_EXISTS" == "true" ]; then
    echo -e "${GREEN}✓${NC} ClusterRoleBinding 'obi' exists"
else
    echo -e "${RED}✗ ClusterRoleBinding 'obi' missing${NC}"
fi

# Check node affinity
echo ""
NODE_AFFINITY=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.spec.template.spec.affinity.nodeAffinity}')
if [ -n "$NODE_AFFINITY" ]; then
    echo -e "${GREEN}✓${NC} Node affinity configured (worker nodes only)"
else
    echo -e "${YELLOW}⚠${NC} Node affinity not configured"
fi

# Summary
echo ""
echo -e "${BLUE}=========================================="
echo "  Verification Summary"
echo "==========================================${NC}"
echo ""

DESIRED=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.status.desiredNumberScheduled}' 2>/dev/null || echo "0")
READY=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.status.numberReady}' 2>/dev/null || echo "0")

if [ "$DESIRED" == "$READY" ] && [ "$READY" != "0" ]; then
    echo -e "${GREEN}✓ OBI is deployed successfully!${NC}"
    echo "  $READY/$DESIRED pods running"
    echo ""
    echo "Next steps:"
    echo "  - View logs: kubectl logs -n $NAMESPACE -l app=obi -f"
    echo "  - Monitor resources: kubectl top pods -n $NAMESPACE -l app=obi"
    echo "  - Deploy sample app to generate telemetry"
else
    echo -e "${YELLOW}⚠ OBI deployment incomplete${NC}"
    echo "  $READY/$DESIRED pods running"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check pod logs: kubectl logs -n $NAMESPACE -l app=obi"
    echo "  - Describe pods: kubectl describe pods -n $NAMESPACE -l app=obi"
    echo "  - Check events: kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'"
fi

echo ""
