#!/bin/bash
set -e

# Configuration
REGISTRY="asia-east1-docker.pkg.dev/develop-server/wms-module"
TAG="v0.0.0" 

echo "Building API image..."
docker build --platform linux/amd64 --target api -t $REGISTRY/api:$TAG .

echo "Building Client image..."
docker build --platform linux/amd64 --target client -t $REGISTRY/client:$TAG .

echo "Pushing images..."
docker push $REGISTRY/api:$TAG
docker push $REGISTRY/client:$TAG

echo "Done! Images pushed to $REGISTRY"
