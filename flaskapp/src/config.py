import os


class Config:
    USERNAME = os.environ.get('USERNAME', 'admin')
    PASSWORD = os.environ.get('PASSWORD', 'admin')
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://mongodb:27017/')
    DATABASE = os.environ.get('DATABASE', 'mydatabase')
    COLLECTION = os.environ.get('COLLECTION', 'mycollection')
    BATCH_SIZE = int(os.environ.get('BATCH_SIZE', 100))
