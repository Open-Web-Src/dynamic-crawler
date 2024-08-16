# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY src/ /app/src

# Make port 5001 available to the world outside this container
EXPOSE 5001

ENV PYTHONPATH=/app/src

# Run the application with Gunicorn
CMD ["gunicorn", "-c", "src/gunicorn_config.py", "src.app:app"]
