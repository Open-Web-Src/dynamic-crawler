import time
import pandas as pd
import subprocess
from scrapy_rt.helpers.constants import Constants
from scheduler.configuration import Config
from celery import shared_task, chain, group
from requests.auth import HTTPBasicAuth
import requests
import logging
import os
import redis
import sys
sys.setrecursionlimit(2000)  # Increase the recursion limit


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Initialize Redis client
redis_client = redis.StrictRedis.from_url(Config.CELERY_BROKER_URL)


@shared_task(acks_late=True)
def run_scrapy_spider(spider_name, **kwargs):
    try:
        # Construct the Scrapy command
        command = ['scrapy', 'crawl', spider_name]

        # Add additional arguments to the command
        for key, value in kwargs.items():
            command.extend([f'-a', f'{key}={value}'])

        # Run the command
        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode == 0:
            logger.info(f"Successfully ran Scrapy spider: {spider_name}")
            # Increment the task counter in Redis
            redis_client.incr('completed_tasks')
            check_and_trigger_final_chain()  # Check if the final chain should be triggered
            return result.stdout
        else:
            logger.error(f"Error running Scrapy spider: {result.stderr}")
            redis_client.incr('completed_tasks')
            check_and_trigger_final_chain()  # Check if the final chain should be triggered
            return "Error running Scrapy spider"

    except Exception as e:
        logger.error(f"Error running Scrapy spider: {e}")
        return f"Error running Scrapy spider or calculate final task"


@shared_task(acks_late=True)
def call_flask_api(result=None, endpoint=None, **kwargs):
    try:
        url = f"{Config.FLASKAPP_URL}/{endpoint}"
        logger.info(
            f"Sending request to Flask API endpoint '{endpoint}' with no payload and timeout={Config.DEFAULT_TIMEOUT}")

        response = requests.post(
            url,
            timeout=Config.DEFAULT_TIMEOUT,
            auth=HTTPBasicAuth(Config.FLASK_API_USERNAME,
                               Config.FLASK_API_PASSWORD)
        )
        if response.status_code == 200:
            logger.info("Request sent successfully.")
            return True
        else:
            logger.error(
                f"Failed to send request: {response.status_code}, {response.text}")
            return f"Failed to send request: {response.status_code}, {response.text}"
    except requests.Timeout:
        logger.error("Request to Flask API timed out.")
        return "Request to Flask API timed out."
    except requests.RequestException as e:
        logger.error(f"Request to Flask API failed: {e}")
        return "Request to Flask API failed"


@shared_task(acks_late=True)
def log_done(*args, **kwargs):
    logger.info("All tasks completed successfully.")

    # Reset the task counters for future runs
    redis_client.set('completed_tasks', 0)
    redis_client.set('total_expected_tasks', 0)

    logger.info("Task counters reset for future runs.")

    return "All tasks completed successfully."


def check_and_trigger_final_chain():
    total_expected_tasks = int(redis_client.get('total_expected_tasks'))
    completed_tasks = int(redis_client.get('completed_tasks'))

    if completed_tasks >= total_expected_tasks:
        # Trigger the final chain
        chain(
            call_flask_api.s(endpoint="summary"),
            call_flask_api.s(endpoint="feasibility"),
            log_done.s()
        ).apply_async()
        logger.info("Final chain triggered.")

        # Set the global ready-to-terminate flag
        redis_client.set('all_workers_ready_to_terminate', 'true')


def create_spider_tasks(df, spider_name, url_template):
    """
    Generates a list of Celery tasks to run Scrapy spiders based on the DataFrame.

    :param df: pandas DataFrame containing data with columns including 'Post Code'.
    :param spider_name: The name of the spider to run (as defined in SPIDER_MAP).
    :param url_template: The URL template where the 'Post Code' will be inserted.
    :return: A list of Celery tasks.
    """
    url_key = 'domain_sold' if spider_name == 'domain_sold' else 'domain_buy'

    return df.apply(
        lambda row: run_scrapy_spider.s(
            spider_name, **{url_key: url_template.format(postcode=row['Post Code'])}
        ),
        axis=1
    ).tolist()


@shared_task(acks_late=True)
def start_crawling():
    # Set the global ready-to-terminate flag
    redis_client.set('all_workers_ready_to_terminate', 'false')

    # Read the Excel file and filter for NSW postcodes
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct the file path relative to the script location
    file_path = os.path.join(current_dir, 'Suburb list.xlsx')

    # Read the Excel file
    df = pd.read_excel(file_path, sheet_name='Sheet1')

    # Clean up the DataFrame by selecting relevant columns and renaming them
    # Selecting the relevant columns (State, Suburb, Post Code)
    df_cleaned = df.iloc[1:, [2, 3, 4]]
    df_cleaned.columns = ['State', 'Suburb',
                          'Post Code']  # Renaming the columns

    # Filter rows where the State is 'NSW'
    df_nsw = df_cleaned[df_cleaned['State'] == 'NSW']

    sold_chunks = [
        df_nsw[i:i + 100].to_dict(orient='records') for i in range(0, len(df_nsw), 100)]
    sale_chunks = [
        df_nsw[i:i + 100].to_dict(orient='records') for i in range(0, len(df_nsw), 100)]

    # Set the total expected tasks in Redis
    total_expected_tasks = sum(
        len(chunk) for chunk in sold_chunks) + sum(len(chunk) for chunk in sale_chunks)
    redis_client.set('total_expected_tasks', total_expected_tasks)

    # Start all batches without waiting for completion of previous ones
    for i, (sold_chunk, sale_chunk) in enumerate(zip(sold_chunks, sale_chunks)):
        sold_chunk_df = pd.DataFrame(sold_chunk)
        sale_chunk_df = pd.DataFrame(sale_chunk)

        # Create spider tasks for the next chunk
        sold_spider_tasks = create_spider_tasks(
            sold_chunk_df, 'domain_sold', Constants.DOMAIN_SOLD + "&postcode={postcode}")

        sale_spider_tasks = create_spider_tasks(
            sale_chunk_df, 'domain_buy', Constants.DOMAIN_BUY + "&postcode={postcode}")

        # Create a group of tasks
        batch_group = group(sold_spider_tasks + sale_spider_tasks)

        # Schedule the batch to run independently
        batch_group.apply_async()

    logger.info("All crawling tasks have been initiated.")
