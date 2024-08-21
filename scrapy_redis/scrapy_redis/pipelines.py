# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
import time
from itemadapter import ItemAdapter
from pymongo import MongoClient, UpdateOne, errors
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global MongoClient instance
mongo_client = None


def connect_with_retry(uri, retries=5, backoff_factor=1):
    """Connect to MongoDB with retries and exponential backoff."""
    for attempt in range(retries):
        try:
            client = MongoClient(
                uri, maxPoolSize=1, socketTimeoutMS=10000, connectTimeoutMS=20000)
            # Test connection
            client.admin.command('ping')
            return client
        except errors.ConnectionFailure as e:
            wait_time = backoff_factor * (2 ** attempt)
            print(
                f"Connection failed: {e}, retrying in {wait_time} seconds...")
            time.sleep(wait_time)
    raise Exception("Could not connect to MongoDB after multiple retries")


def get_global_mongo_client(uri):
    global mongo_client
    if mongo_client is None:
        mongo_client = connect_with_retry(uri)
        logging.info("MongoDB client created successfully.")
    return mongo_client


class ScrapyRtPipeline:
    def process_item(self, item, spider):
        return item


class MongoDBPineline(object):
    @classmethod
    def from_crawler(cls, crawler):
        mongo_uri = crawler.settings.get('MONGO_URI')
        mongo_db = crawler.settings.get('MONGO_DATABASE')
        collection_name = crawler.settings.get('MONGO_COLLECTION')
        batch_size = crawler.settings.get('BATCH_SIZE')
        return cls(mongo_uri, mongo_db, collection_name, batch_size)

    def __init__(self, mongo_uri, mongo_db, collection_name, batch_size):
        self.mongo_uri = mongo_uri
        self.mongo_db = mongo_db
        self.collection_name = collection_name
        self.batch_size = batch_size

        self.client = None
        self.db = None
        self.collection = None
        self.batch = []

    def open_spider(self, spider):
        try:
            # Use the global function to get or create the MongoClient
            self.client = get_global_mongo_client(self.mongo_uri)
            self.db = self.client[self.mongo_db]
            self.collection = self.db[self.collection_name]
            logging.info(
                f"MongoDB connection to {self.mongo_db} opened successfully.")
        except Exception as e:
            logging.error(f"Failed to connect to MongoDB: {e}")
            raise

    def close_spider(self, spider):
        try:
            if self.batch:
                self.insert_batch()
        except Exception as e:
            logging.error(f"Failed to insert batch during spider close: {e}")

    def process_item(self, item, spider):
        try:
            # Append item to batch
            self.batch.append(dict(item))

            # Check if batch size is reached, then insert
            if len(self.batch) >= self.batch_size:
                self.insert_batch()

            return item
        except errors.PyMongoError as e:
            logging.error(f"Error processing item: {e}")
            raise

    def insert_batch(self):
        try:
            operations = []
            for item in self.batch:
                operations.append(
                    UpdateOne(
                        {'data_id': item['data_id'],
                            'for_sale': item['for_sale']},
                        {'$set': item},
                        upsert=True
                    )
                )
            # Perform bulk update
            if operations:
                self.collection.bulk_write(operations)
                logging.info("Batch inserted successfully.")

            # Clear batch after insertion or update
            self.batch = []
        except errors.BulkWriteError as e:
            logging.error(f"Bulk write error: {e.details}")
        except errors.PyMongoError as e:
            logging.error(f"Error inserting batch: {e}")
