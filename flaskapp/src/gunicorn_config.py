# gunicorn_config.py
bind = "0.0.0.0:5001"
workers = 1  # 1 worker for 0.25 vCPU
timeout = 1800  # 30 minutes
