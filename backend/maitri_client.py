"""Optional Maitri web ingestor for the prototype MQTT pipeline."""
from __future__ import annotations
import json, os, re, time
from datetime import datetime, timezone
from typing import Optional
import paho.mqtt.client as mqtt
import requests
from bs4 import BeautifulSoup

NCPOR_URL=os.getenv('MAITRI_URL','https://data.ncpor.res.in/maitri/live')
MQTT_HOST=os.getenv('MQTT_HOST','localhost'); MQTT_PORT=int(os.getenv('MQTT_PORT','1883'))
MQTT_TOPIC=os.getenv('MQTT_TOPIC','antarctica/maitri/telemetry')
INTERVAL=int(os.getenv('MAITRI_POLL_SECONDS','60')); TIMEOUT=int(os.getenv('MAITRI_HTTP_TIMEOUT','20'))


def number_after_label(text:str,label:str)->Optional[float]:
    m=re.search(rf'{re.escape(label)}\s*:?\s*(-?\d+(?:\.\d+)?)',text,re.I)
    return float(m.group(1)) if m else None


def fetch_maitri()->dict:
    r=requests.get(NCPOR_URL,timeout=TIMEOUT,headers={'User-Agent':'POLARIS/1.0 (educational SIH prototype)'})
    r.raise_for_status(); text=' '.join(BeautifulSoup(r.text,'html.parser').stripped_strings)
    t=number_after_label(text,'Temperature'); rh=number_after_label(text,'Relative Humidity'); p=number_after_label(text,'Air Pressure'); wkt=number_after_label(text,'Wind Speed')
    if None in (t,rh,p,wkt): raise ValueError('Could not parse one or more Maitri fields from the source page')
    return {'station':'Maitri','source':'NCPOR Maitri AWS','mode':'REAL','status':'LIVE MAITRI','temperature':round(t,2),'humidity':round(rh,2),'pressure':round(p,2),'wind_speed':round(wkt*1.852,2),'wind_speed_source':'knots','timestamp':datetime.now(timezone.utc).isoformat(),'source_url':NCPOR_URL}


def main():
    client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,client_id='polaris-maitri-ingestor')
    username=os.getenv('MQTT_USERNAME','')
    if username: client.username_pw_set(username,os.getenv('MQTT_PASSWORD',''))
    client.connect(MQTT_HOST,MQTT_PORT,30); client.loop_start()
    try:
        while True:
            try:
                payload=fetch_maitri(); client.publish(MQTT_TOPIC,json.dumps(payload,separators=(',',':')),qos=1,retain=True); print('[MAITRI]',payload)
            except Exception as exc: print('[MAITRI] error:',exc)
            time.sleep(INTERVAL)
    except KeyboardInterrupt: pass
    finally: client.loop_stop(); client.disconnect()

if __name__=='__main__': main()
