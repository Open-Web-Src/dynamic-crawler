FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the logging script
COPY src/ .

# Install necessary Python packages
RUN pip install redis python-dotenv boto3

# Command to run the logging script
CMD ["python", "src/log_redis_queue.py"]
