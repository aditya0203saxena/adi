# POLARIS Digital Twin Test

Isolated integration sandbox for the POLARIS Antarctic station operations console.

## What is wired now

- Five operational modules in the test console.
- FastAPI telemetry gateway at `/api/telemetry`.
- WebSocket live feed at `/ws` with browser HTTP fallback.
- MQTT subscriber feeding a transparent prototype risk engine.
- Local MQTT simulator for sensor-style data.
- Environment template with no real secrets.

```text
Sensors / simulator -> MQTT -> FastAPI -> risk engine -> WebSocket/HTTP -> browser digital twin
```

## Run locally

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
$env:PYTHONPATH="$PWD\backend"
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/`.

To test without physical sensors, start a local MQTT broker and run:

```powershell
python backend\simulator.py
```

Example topic: `antarctica/maitri/telemetry`.

## Blender / GLB

The provided `landscape.blend` is intentionally excluded from Git because it is roughly 200 MB and is an authoring file. Export an optimized `.glb` and place it in `assets/models/` for the next integration step.

## Secrets

Never commit `.env`, MQTT passwords, Supabase secret/service-role keys, or API tokens. `.env.example` is the safe template.

Production `kalki26060` is not modified by this branch.
