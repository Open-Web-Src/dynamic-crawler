#!/bin/bash
# Only run for the first time

# Variables
REGION=us-east-1
ACCOUNT_ID=786201404630
PROFILE="default"

# Function to retrieve ECR URI from Parameter Store
get_ecr_uri() {
    local parameter_name=$1
    aws ssm get-parameter --name "$parameter_name" --query "Parameter.Value" --output text --region $REGION --profile $PROFILE
}

# Log in to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION --profile $PROFILE | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com || { echo 'ECR login failed' ; exit 1; }

# Retrieve ECR URIs
echo "Retrieving ECR URIs from Parameter Store..."
CRAWLER_REPO_URI=$(get_ecr_uri /ecr/crawler_repo_uri)
FLASKAPP_REPO_URI=$(get_ecr_uri /ecr/flaskapp_repo_uri)
REACTAPP_REPO_URI=$(get_ecr_uri /ecr/reactapp_repo_uri)
REDIS_LOGGING_REPO_URI=$(get_ecr_uri /ecr/redis_logging_repo_uri)

# Check if URIs were retrieved successfully
if [ -z "$CRAWLER_REPO_URI" ] || \
   [ -z "$FLASKAPP_REPO_URI" ] || \
   [ -z "$REACTAPP_REPO_URI" ] || \
   [ -z "$REDIS_LOGGING_REPO_URI" ]; then
  echo "Failed to retrieve one or more ECR URIs"
  exit 1
fi

echo "CRAWLER_REPO_URI: $CRAWLER_REPO_URI"
echo "FLASKAPP_REPO_URI: $FLASKAPP_REPO_URI"
echo "REACTAPP_REPO_URI: $REACTAPP_REPO_URI"
echo "REACTAPP_REPO_URI: $REDIS_LOGGING_REPO_URI"

# Ensure Buildx is set up
docker buildx create --use

# Build and push Scrapy RT image
echo "Building and pushing Scrapy RT image..."
docker buildx build --platform linux/amd64 -t $CRAWLER_REPO_URI:latest ./scrapy_redis --push || { echo 'Build and push failed for Scrapy RT' ; exit 1; }

# Build and push Flask app image
echo "Building and pushing Flask app image..."
docker buildx build --platform linux/amd64 -t $FLASKAPP_REPO_URI:latest ./flaskapp --push || { echo 'Build and push failed for Flask app' ; exit 1; }

# Build and push React app image
echo "Building and pushing React app image..."
docker buildx build --platform linux/amd64 -t $REACTAPP_REPO_URI:latest ./reactapp --push || { echo 'Build and push failed for React app' ; exit 1; }

# Build and push React app image
echo "Building and pushing Redis Logging image..."
docker buildx build --platform linux/amd64 -t $REDIS_LOGGING_REPO_URI:latest ./redis_monitoring --push || { echo 'Build and push failed for Redis Logging' ; exit 1; }

echo "All images have been pushed to ECR."
