# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install Python dependencies from requirements.txt
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY scrapy_redis /app/scrapy_redis
COPY scrapy.cfg /app/scrapy.cfg
COPY scheduler/ /app/scheduler

# Expose the default ScrapyRT port
EXPOSE 9080

# Command to run Celery worker when the container starts - With concurrency of 1
CMD ["celery", "-A", "scheduler.app", "worker", "-B", "-l", "DEBUG", "-c", "2"]
