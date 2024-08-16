from celery import Celery
from scheduler.configuration import Config
from celery.schedules import crontab

app = Celery('tasks_listiners',
             broker=Config.CELERY_BROKER_URL,
             backend=Config.CELERY_RESULT_BACKEND,
             include=['scheduler.tasks'])

app.conf.broker_transport_options = {
    'visibility_timeout': 259200  # 72 hours (3 days)
}

app.conf.update(
    result_expires=259200,  # 72 hours (3 days)
    task_soft_time_limit=259200,  # 72 hours (3 days)
    task_time_limit=259200,  # 72 hours (3 days)
    timezone='UTC',
    task_acks_late=True,
    task_reject_on_worker_lost=True,  # Reject the task if the worker crashes
    worker_prefetch_multiplier=1,  # Ensure only one task is pre-fetched at a time
)

if __name__ == '__main__':
    app.start()
