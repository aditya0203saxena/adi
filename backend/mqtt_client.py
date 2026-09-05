import os
from datetime import datetime, timezone
from typing import Callable, Optional
import paho.mqtt.client as mqtt

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "antarctica/maitri/telemetry")
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

class MQTTBridge:
    def __init__(self, on_message: Callable[[dict], None]):
        self.on_message = on_message
        self.client: Optional[mqtt.Client] = None
        self.connected = False

    def start(self):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="polaris-backend")
        if MQTT_USERNAME:
            self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        self.client.reconnect_delay_set(min_delay=1, max_delay=10)
        try:
            self.client.connect(MQTT_HOST, MQTT_PORT, keepalive=30)
            self.client.loop_start()
        except Exception as exc:
            print(f"[MQTT] Broker unavailable at {MQTT_HOST}:{MQTT_PORT}: {exc}")

    def stop(self):
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass

    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        self.connected = reason_code == 0
        print(f"[MQTT] connected={self.connected}, reason={reason_code}")
        if self.connected:
            client.subscribe(MQTT_TOPIC, qos=1)
            print(f"[MQTT] subscribed to {MQTT_TOPIC}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None):
        self.connected = False
        print(f"[MQTT] disconnected: {reason_code}")

    def _on_message(self, client, userdata, msg):
        import json
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            payload.setdefault("topic", msg.topic)
            payload.setdefault("received_at", datetime.now(timezone.utc).isoformat())
            self.on_message(payload)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            print(f"[MQTT] invalid payload: {exc}")
