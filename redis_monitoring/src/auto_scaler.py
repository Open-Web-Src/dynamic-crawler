import re
import os
import time
import json
import subprocess
import logging
import uuid
import redis


# Configuration constants
# File where queue length is logged in dev
METRICS_FILE = '/app/metrics/queue_length.json'
RETRY_ATTEMPTS = 3
RETRY_DELAY = 0.1  # 100 ms delay between retries

# Initialize last known good value
last_known_queue_length = 0

MIN_WORKERS = 1                     # Minimum number of worker containers
MAX_WORKERS = 15                     # Maximum number of worker containers
SCALE_UP_THRESHOLD = 1              # Queue length threshold to scale up
SCALE_DOWN_THRESHOLD = 0            # Queue length threshold to scale down
DOCKER_OPERATION_DELAY = 5         # Delay after Docker operations in seconds

# Redis client initialization
REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
redis_client = redis.StrictRedis.from_url(
    f'redis://{REDIS_HOST}:{REDIS_PORT}/0')


def get_queue_length():
    """Reads the queue length from the metrics file, with retries and fallback to last known good value."""
    global last_known_queue_length

    for attempt in range(RETRY_ATTEMPTS):
        try:
            with open(METRICS_FILE, 'r') as f:
                content = f.read().strip()
                if not content:
                    logging.warning(
                        f"Metrics file is empty on attempt {attempt + 1}/{RETRY_ATTEMPTS}: {METRICS_FILE}")
                    time.sleep(RETRY_DELAY)
                    continue  # Retry if the file is empty

                metrics = json.loads(content)
                queue_length = metrics.get(
                    'queue_length', last_known_queue_length)

                # Update the last known good value
                last_known_queue_length = queue_length
                return queue_length

        except (FileNotFoundError, json.JSONDecodeError) as e:
            logging.error(
                f"Error reading metrics file on attempt {attempt + 1}/{RETRY_ATTEMPTS}: {e}")
            time.sleep(RETRY_DELAY)

    # If all retries fail, return the last known good value
    logging.warning(
        f"Returning last known good queue length value: {last_known_queue_length}")
    return last_known_queue_length


def get_current_workers():
    """Gets the current number of running worker containers."""
    result = subprocess.check_output(
        ["docker", "ps", "-q", "--filter", "name=crawler_replica_"]).decode('utf-8')
    return len(result.strip().split("\n")) if result else 0


def all_workers_ready_to_terminate():
    """
    Check if all workers are ready to terminate based on the Redis flag.
    If the flag does not exist, return True by default.
    """
    flag_value = redis_client.get('all_workers_ready_to_terminate')

    # If the key doesn't exist, return True by default
    if flag_value is None:
        return True

    return flag_value == b'true'


def reset_ready_to_terminate_flag():
    """Reset the ready-to-terminate flag in Redis."""
    redis_client.set('all_workers_ready_to_terminate', 'false')


def get_worker_status(container_name):
    try:
        result = subprocess.check_output(
            ["docker", "exec", container_name, "celery", "-A",
                "scheduler.app_replicas", "inspect", "active"]
        ).decode('utf-8').strip()

        if not result:
            logging.warning(
                f"No response from worker {container_name}. Assuming no active tasks.")
            return []

        # Extract JSON-like structures from the output
        pattern = re.compile(r"\* ({.*?})", re.DOTALL)
        tasks = pattern.findall(result)

        task_list = []
        for task_str in tasks:
            try:
                task_list.append(json.loads(task_str))
            except json.JSONDecodeError as e:
                logging.error(
                    f"Failed to parse task JSON from worker {container_name}: {e} | Raw task string: {task_str}")

        return task_list

    except subprocess.CalledProcessError as e:
        logging.error(f"Error checking worker status: {e}")
        return []


def scale_workers(desired_workers):
    """Scales the number of worker containers."""
    network_name = "dynamic-crawler_local_network"  # Replace with your actual network name
    # This should be accessible from the auto_scaler container
    env_file_path = "/app"
    image = "dynamic-crawler-crawler_main:latest"

    current_workers = get_current_workers()

    if desired_workers > current_workers:  # SCALE UP
        for _ in range(desired_workers - current_workers):
            unique_id = uuid.uuid4().hex[:6]
            container_name = f"crawler_replica_{unique_id}_container"

            # Check if a container with the same name already exists
            existing_container = subprocess.run(
                ["docker", "ps", "-q", "--filter", f"name={container_name}"],
                capture_output=True, text=True).stdout.strip()

            if existing_container:
                logging.warning(
                    f"Container {container_name} already exists. Skipping creation.")
                continue

            subprocess.run(
                [
                    "docker", "run", "-d",
                    "--name", container_name,
                    "--network", network_name,
                    "--env-file", f"{env_file_path}/.scrapy.env",
                    "--cpus", "0.25",  # Limits the container to 0.25 CPUs
                    "--memory", "512m",  # Limits the container to 512MB of RAM
                    image,
                    "celery", "-A", "scheduler.app_replicas", "worker", "-l", "INFO", "-c", "2"
                ])
            # Allow time for Docker to start the container
            time.sleep(DOCKER_OPERATION_DELAY)

    elif desired_workers < current_workers:  # SCALE DOWN
        worker_containers = subprocess.check_output(
            ["docker", "ps", "-q", "--filter", "name=crawler_replica_"]).decode('utf-8').strip().split("\n")
        for container in worker_containers[:current_workers - desired_workers]:
            subprocess.run(["docker", "stop", container])
            subprocess.run(["docker", "rm", container])
            time.sleep(DOCKER_OPERATION_DELAY)

        # Reset the ready-to-terminate flag when scaled down to MIN_WORKERS
        if desired_workers <= MIN_WORKERS:
            reset_ready_to_terminate_flag()


# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')


def main():
    """Main loop to monitor queue length and scale workers."""
    while True:
        queue_length = get_queue_length()
        current_workers = get_current_workers()
        logging.info(
            f"Current queue length: {queue_length}, curr_worker: {current_workers}")

        if queue_length > SCALE_UP_THRESHOLD and current_workers < MAX_WORKERS:
            scale_workers(current_workers + 1)
        elif queue_length <= SCALE_DOWN_THRESHOLD and current_workers > MIN_WORKERS:
            if all_workers_ready_to_terminate():
                scale_workers(current_workers - 1)

        time.sleep(5)


if __name__ == '__main__':
    main()
