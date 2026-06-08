FROM python:3.12-slim

# Install system dependencies (required for some Python packages and local DB drivers)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for Docker caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Copy application code (context is root)
COPY . .

# Ensure the sandbox workspace directory exists
RUN mkdir -p /app/workspace

# Default port exposure
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
