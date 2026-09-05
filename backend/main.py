import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from mqtt_client import MQTTBridge
from risk_engine import calculate_risk

clients: Set[WebSocket] = set()
latest = {
    "status": "WAITING FOR MQTT",
    "source": "MQTT / awaiting telemetry",
    "temperature": None,
    "wind_speed": None,
    "wind_direction": None,
    "pressure": None,
    "humidity": None,
    "risk": "NO DATA",
    "timestamp": None,
}

loop = None


def handle_mqtt(data: dict):
    global latest
    risk = calculate_risk(data)
    latest = {
        **latest,
        **data,
        "risk": risk.level,
        "risk_score": risk.score,
        "risk_factors": risk.factors,
        "risk_model": "POLARIS prototype rule engine",
        "status": "LIVE MQTT",
        "source": data.get("source") or "MQTT / telemetry",
        "timestamp": data.get("timestamp") or datetime.now(timezone.utc).isoformat(),
    }
    message = json.dumps(latest)
    if loop:
        for ws in list(clients):
            asyncio.run_coroutine_threadsafe(ws.send_text(message), loop)


mqtt_bridge = MQTTBridge(handle_mqtt)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global loop
    loop = asyncio.get_running_loop()
    mqtt_bridge.start()
    yield
    mqtt_bridge.stop()


app = FastAPI(title="POLARIS Telemetry API", lifespan=lifespan)


@app.get("/api/health")
async def health():
    return {"api": "ok", "mqtt_connected": mqtt_bridge.connected, "latest": latest}


@app.get("/api/telemetry")
async def telemetry():
    return latest


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    await websocket.send_text(json.dumps(latest))
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        clients.discard(websocket)


BASE_DIR = Path(__file__).resolve().parent.parent


@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "index.html")


app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="frontend")
