const moduleNames={ground:'GROUND STATION',meteorology:'METEOROLOGY',compliance:'COMPLIANCE', 'well-being':'WELL-BEING',infrastructure:'INFRASTRUCTURE'};

function updateClock(){
  const el=document.querySelector('#clock');
  if(el) el.textContent=new Date().toISOString().slice(11,19)+' UTC';
}
setInterval(updateClock,1000); updateClock();

document.querySelectorAll('.module').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.module').forEach(item=>item.classList.remove('active'));
  button.classList.add('active');
  const key=button.dataset.module;
  const label=document.querySelector('#moduleLabel');
  const frame=document.querySelector('#moduleFrame');
  if(label) label.textContent=moduleNames[key]||key.toUpperCase();
  if(frame) frame.src=`legacy-operations.html?module=${encodeURIComponent(key)}`;
}));

async function checkBackend(){
  const state=document.querySelector('#backendState');
  const source=document.querySelector('#backendSource');
  try{
    const response=await fetch('/api/health',{cache:'no-store'});
    if(!response.ok) throw new Error('HTTP '+response.status);
    const payload=await response.json();
    if(state) state.textContent=payload.mqtt_connected?'MQTT CONNECTED':'API ONLINE / MQTT WAITING';
    if(source) source.textContent=payload.latest?.source||'Telemetry gateway';
  }catch(error){
    if(state) state.textContent='BACKEND OFFLINE';
    if(source) source.textContent='Run FastAPI from the project root';
  }
}
checkBackend(); setInterval(checkBackend,5000);
