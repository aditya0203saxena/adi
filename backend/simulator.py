import json
import math
import os
import random
import time
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

HOST=os.getenv('MQTT_HOST','localhost')
PORT=int(os.getenv('MQTT_PORT','1883'))
TOPIC=os.getenv('MQTT_TOPIC','antarctica/maitri/telemetry')
INTERVAL=float(os.getenv('SIMULATOR_INTERVAL','2'))

client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id='polaris-simulator')
username=os.getenv('MQTT_USERNAME','')
if username: client.username_pw_set(username, os.getenv('MQTT_PASSWORD',''))
client.connect(HOST,PORT,30)
client.loop_start()

try:
    t=0
    while True:
        payload={
            'station':'Maitri','source':'sensor-simulator','mode':'SIMULATED','status':'LIVE SIMULATOR',
            'temperature':round(-22-5*math.sin(t/12)+random.uniform(-0.5,0.5),2),
            'wind_speed':round(35+38*max(0,math.sin(t/9))+random.uniform(-2,2),2),
            'wind_direction':round((140+25*math.sin(t/15))%360,1),
            'pressure':round(980-28*max(0,math.sin(t/17))+random.uniform(-2,2),1),
            'humidity':round(76+20*max(0,math.sin(t/13))+random.uniform(-1,1),1),
            'timestamp':datetime.now(timezone.utc).isoformat(),
        }
        client.publish(TOPIC,json.dumps(payload),qos=1,retain=True)
        print(payload)
        t+=1
        time.sleep(INTERVAL)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop(); client.disconnect()
