FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies first (cached layer unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app ./app

# Copy environment file (values will be overridden by docker-compose environment section)
COPY .env .env

# Expose FastAPI port
EXPOSE 8000

# Start uvicorn — module path matches app/main.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
