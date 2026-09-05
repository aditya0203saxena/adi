# POLARIS Digital Twin Test

Isolated integration sandbox for the POLARIS Antarctica digital twin.

## Purpose
- Preserve the production `kalki26060` repository untouched.
- Test the Blender/Three.js digital twin integration.
- Prepare the frontend/backend structure for live telemetry and risk visualization.

## Planned architecture
- Vercel/static frontend
- Three.js + GLB Antarctica model
- FastAPI telemetry gateway
- MQTT simulator now; physical sensors later
- Server-side risk engine
- WebSocket live updates

## Secrets
Never commit `.env` files, Supabase secret/service-role keys, MQTT passwords, or API tokens.
