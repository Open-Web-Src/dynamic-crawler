import os


class Config:
    CELERY_BROKER_URL = os.environ.get(
        'CELERY_BROKER_URL', 'redis://redis.app.local:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get(
        'CELERY_RESULT_BACKEND', 'redis://redis.app.local:6379/0')
    FLASKAPP_URL = os.environ.get(
        'FLASKAPP_URL', 'http://flaskapp.app.local:5001/api')
    DEFAULT_TIMEOUT = int(os.environ.get(
        'FLASKAPP_DEFAULT_TIMEOUT', 1800))  # 30 mins
    FLASK_API_USERNAME = os.environ.get('USERNAME')
    FLASK_API_PASSWORD = os.environ.get('PASSWORD')
