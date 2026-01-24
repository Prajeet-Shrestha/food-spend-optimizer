#!/bin/bash

# Docker Build and Push Script
# Usage: ./docker-push.sh [registry-url/username] [image-name] [tag]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGISTRY="${1:-your-dockerhub-username}"
IMAGE_NAME="${2:-food-spend-optimizer}"
TAG="${3:-latest}"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Docker Build and Push Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${GREEN}Registry:${NC} ${REGISTRY}"
echo -e "${GREEN}Image Name:${NC} ${IMAGE_NAME}"
echo -e "${GREEN}Tag:${NC} ${TAG}"
echo -e "${GREEN}Full Image:${NC} ${FULL_IMAGE_NAME}"
echo ""

# Build the Docker image directly with the full tag
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""

# Push to registry
echo -e "${YELLOW}Step 2: Pushing to registry...${NC}"
echo -e "${YELLOW}Note: Make sure you're logged in (docker login)${NC}"
docker push ${FULL_IMAGE_NAME}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Push successful${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    echo -e "${YELLOW}Did you run 'docker login' first?${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All steps completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Image pushed: ${GREEN}${FULL_IMAGE_NAME}${NC}"
echo ""

