FROM python:3.11-slim

WORKDIR /app

# Dependencias primero (mejor cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código
COPY . .

# Cloud Run usa PORT env var; local puedes usar 8080
ENV PORT=8080
EXPOSE 8080

# Si usas Flask app = app dentro de server.py
CMD ["python", "server.py"]
