from celery import Celery
from celery.schedules import crontab
from scheduler.configuration import Config


app = Celery('tasks',
             broker=Config.CELERY_BROKER_URL,
             backend=Config.CELERY_RESULT_BACKEND,
             include=['scheduler.tasks'])

# app.conf.task_routes = {
#     'scheduler.tasks.start_crawling': {'queue': 'crawling_queue'},
# }

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
    beat_schedule={
        'start_crawling_daily': {
            'task': 'scheduler.tasks.start_crawling',
            'schedule': crontab(hour=11, minute=40),
        },
    },
)

if __name__ == '__main__':
    app.start()
