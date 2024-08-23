import os
import time
import redis
import json
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_QUEUE_NAME = os.getenv('REDIS_QUEUE_NAME')

# AWS CloudWatch configuration
ENV = os.getenv('ENV')  # 'dev' or 'pro'
AWS_REGION = os.getenv('AWS_REGION')
CLOUDWATCH_NAMESPACE = os.getenv('CLOUDWATCH_NAMESPACE')
CLOUDWATCH_METRIC_NAME = os.getenv('CLOUDWATCH_METRIC_NAME')
CLOUDWATCH_DIMENSIONS_0 = os.getenv('CLOUDWATCH_DIMENSIONS_0')

# Initialize Redis client
redis_client = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT)


def log_to_file(queue_length):
    """Logs the queue length to a local file in development environment."""
    with open('/app/metrics/queue_length.json', 'w') as f:
        json.dump({'queue_length': queue_length}, f)


def log_to_cloudwatch(queue_length):
    """Pushes the queue length to AWS CloudWatch in production environment."""
    try:
        cloudwatch_client = boto3.client('cloudwatch', region_name=AWS_REGION)
        cloudwatch_client.put_metric_data(
            Namespace=CLOUDWATCH_NAMESPACE,
            MetricData=[
                {
                    'MetricName': CLOUDWATCH_METRIC_NAME,
                    'Dimensions': [
                        {
                            'Name': CLOUDWATCH_DIMENSIONS_0,
                            'Value': REDIS_QUEUE_NAME
                        },
                    ],
                    'Value': queue_length,
                    'Unit': 'Count'
                },
            ]
        )
    except (NoCredentialsError, PartialCredentialsError) as e:
        print(f"Error: {str(e)}")


def log_queue_length():
    """Logs the queue length either to a file (dev) or CloudWatch (pro)."""
    while True:
        try:
            queue_length = redis_client.llen(REDIS_QUEUE_NAME)
            if ENV == 'dev':
                log_to_file(queue_length)
            elif ENV == 'pro':
                log_to_cloudwatch(queue_length)
        except redis.ConnectionError as e:
            error_message = f"Redis connection error: {str(e)}"
            print(error_message)
        except Exception as e:
            error_message = f"Unexpected error: {str(e)}"
            print(error_message)
        time.sleep(5)


if __name__ == '__main__':
    log_queue_length()
