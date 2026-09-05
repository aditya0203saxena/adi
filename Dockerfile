FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends mosquitto supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY . .
COPY deploy/supervisord.conf /etc/supervisor/conf.d/polaris.conf

ENV PYTHONPATH=/app/backend
ENV MQTT_HOST=127.0.0.1
ENV MQTT_PORT=1883
ENV MQTT_TOPIC=antarctica/maitri/telemetry
ENV MAITRI_POLL_SECONDS=60

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
