# POLARIS MQTT setup

## Terminal 1 — broker

Install Mosquitto locally, then run:

```powershell
mosquitto -c mosquitto\mosquitto.conf -v
```

## Terminal 2 — FastAPI

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
$env:PYTHONPATH="$PWD\backend"
uvicorn backend.main:app --reload
```

## Terminal 3 — simulated station telemetry

```powershell
python backend\simulator.py
```

The simulator publishes JSON to `antarctica/maitri/telemetry`. The FastAPI service consumes it, calculates prototype risk, and streams the normalized state to the browser over WebSocket.
