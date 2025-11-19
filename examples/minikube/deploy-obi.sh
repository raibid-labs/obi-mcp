#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${OBI_NAMESPACE:-observability}"
OBI_IMAGE="${OBI_IMAGE:-otel/ebpf-instrument:latest}"
OTLP_ENDPOINT="${OTLP_ENDPOINT:-http://localhost:4317}"
OBI_CPU_LIMIT="${OBI_CPU_LIMIT:-500m}"
OBI_MEMORY_LIMIT="${OBI_MEMORY_LIMIT:-512Mi}"
OBI_CPU_REQUEST="${OBI_CPU_REQUEST:-100m}"
OBI_MEMORY_REQUEST="${OBI_MEMORY_REQUEST:-128Mi}"

echo "=========================================="
echo "  OBI Deployment to minikube"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Image: $OBI_IMAGE"
echo "  OTLP Endpoint: $OTLP_ENDPOINT"
echo "  CPU Limit: $OBI_CPU_LIMIT"
echo "  Memory Limit: $OBI_MEMORY_LIMIT"
echo ""

# Check if cluster is running
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cluster not accessible${NC}"
    echo "Run ./setup.sh first to create the cluster"
    exit 1
fi

# Create namespace if it doesn't exist
echo "Ensuring namespace exists..."
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy OBI
echo ""
echo "Deploying OBI resources..."

kubectl apply -f - <<EOF
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: obi
  namespace: $NAMESPACE
  labels:
    app: obi
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: obi
  labels:
    app: obi
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "nodes", "namespaces"]
    verbs: ["list", "watch", "get"]
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "replicasets", "statefulsets"]
    verbs: ["list", "watch", "get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: obi
  labels:
    app: obi
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: obi
subjects:
  - kind: ServiceAccount
    name: obi
    namespace: $NAMESPACE
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: obi
  namespace: $NAMESPACE
  labels:
    app: obi
    app.kubernetes.io/name: obi
    app.kubernetes.io/component: instrumentation
spec:
  selector:
    matchLabels:
      app: obi
  template:
    metadata:
      labels:
        app: obi
        app.kubernetes.io/name: obi
        app.kubernetes.io/component: instrumentation
    spec:
      serviceAccountName: obi
      hostPID: true
      hostNetwork: true
      containers:
      - name: obi
        image: $OBI_IMAGE
        imagePullPolicy: Always
        securityContext:
          privileged: true
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_RESOURCE
              - SYS_PTRACE
              - NET_ADMIN
              - NET_RAW
              - IPC_LOCK
        env:
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "$OTLP_ENDPOINT"
        - name: OTEL_SERVICE_NAME
          value: "obi-minikube"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "deployment.environment=minikube,k8s.cluster.name=obi-demo"
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: OTEL_EBPF_METRIC_FEATURES
          value: "network,application"
        resources:
          limits:
            cpu: $OBI_CPU_LIMIT
            memory: $OBI_MEMORY_LIMIT
          requests:
            cpu: $OBI_CPU_REQUEST
            memory: $OBI_MEMORY_REQUEST
        volumeMounts:
        - name: host-sys
          mountPath: /sys
          readOnly: true
        - name: host-proc
          mountPath: /host/proc
          readOnly: true
      volumes:
      - name: host-sys
        hostPath:
          path: /sys
          type: Directory
      - name: host-proc
        hostPath:
          path: /proc
          type: Directory
      tolerations:
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
EOF

echo ""
echo "Waiting for OBI DaemonSet to be ready..."
echo "(This may take 1-2 minutes while images are pulled)"
echo ""

# Wait with timeout
TIMEOUT=180
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    DESIRED=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.status.desiredNumberScheduled}' 2>/dev/null || echo "0")
    READY=$(kubectl get daemonset -n "$NAMESPACE" obi -o jsonpath='{.status.numberReady}' 2>/dev/null || echo "0")

    echo "  DaemonSet status: $READY/$DESIRED pods ready"

    if [ "$DESIRED" != "0" ] && [ "$READY" == "$DESIRED" ]; then
        echo ""
        echo -e "${GREEN}✓ All OBI pods are ready!${NC}"
        break
    fi

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo ""
    echo -e "${YELLOW}Warning: Deployment did not complete within timeout${NC}"
    echo "Check pod status with: kubectl get pods -n $NAMESPACE"
    echo "Check logs with: kubectl logs -n $NAMESPACE -l app=obi"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  OBI Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Namespace: $NAMESPACE"
echo ""
echo "DaemonSet status:"
kubectl get daemonset -n "$NAMESPACE" obi
echo ""
echo "Pod status:"
kubectl get pods -n "$NAMESPACE" -l app=obi -o wide
echo ""
echo -e "${GREEN}Next step:${NC} Run ./verify.sh to verify the deployment"
echo ""
echo "Useful commands:"
echo "  - View logs: kubectl logs -n $NAMESPACE -l app=obi -f"
echo "  - Check status: kubectl get pods -n $NAMESPACE"
echo "  - Monitor resources: kubectl top pods -n $NAMESPACE -l app=obi"
