from flask import g, current_app
from pymongo import MongoClient


def get_db():
    if 'db' not in g:
        # Access the MongoDB URI from the Flask configuration
        client = MongoClient(current_app.config['MONGO_URI'])
        g.db = client[current_app.config['DATABASE']]
    return g.db


def fetch_data_from_db(db, collection_name, filter=None, projection=None, sort=None, limit=None):
    """
    Fetch data from a specified collection in the database with an optional filter, projection, sort, and limit.

    :param db: MongoDB client database instance
    :param collection_name: str, name of the collection to fetch data from
    :param filter: dict, optional filter to apply to the query
    :param projection: dict, optional projection to specify fields to return
    :param sort: list of tuples, optional sort criteria (e.g., [('field', pymongo.DESCENDING)])
    :param limit: int, optional limit on the number of documents to fetch
    :return: list, data fetched from the collection
    """
    collection = db[collection_name]
    query = collection.find(filter, projection)

    if sort:
        query = query.sort(sort)

    if limit:
        query = query.limit(limit)

    data = list(query)
    return data


def convert_objectid_to_str(documents):
    """
    Convert the _id field in MongoDB documents from ObjectId to string.

    :param documents: list, list of MongoDB documents
    :return: list, list of documents with _id as a string
    """
    for document in documents:
        if '_id' in document:
            document['_id'] = str(document['_id'])
    return documents


def check_db_connection():
    try:
        # Access the MongoDB URI from the Flask configuration
        client = MongoClient(current_app.config['MONGO_URI'])
        client.admin.command('ping')
        return True
    except Exception as e:
        current_app.logger.error(f"Database connection failed: {e}")
        return False
