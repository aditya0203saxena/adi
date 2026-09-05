(() => {
  // Load the restored interaction layer without disturbing the existing layout CSS.
  const uiCss = document.createElement('link');
  uiCss.rel = 'stylesheet';
  uiCss.href = 'ui-interaction.css?v=2.5d-restore-1';
  document.head.appendChild(uiCss);

  const assetData = {
    'main-station': ['MAIN RESEARCH STATION','DEMO / NO DATA','DEMO WATCH',['ENERGY','LABS','CORE'],'Illustrative demo feed. Real telemetry is not connected.','This station core is the primary digital-twin reference point.'],
    'weather': ['WEATHER STATION','DEMO / NO LIVE DATA','DEMO WATCH',['TEMP','WIND','PRESSURE','HUMIDITY'],'Illustrative demo feed. Real weather telemetry is not connected.','Weather instrumentation is prepared for MQTT sensor integration and risk scoring.'],
    'communications': ['COMMUNICATIONS ARRAY','DEMO / NO LIVE DATA','DEMO WATCH',['HF / TTC','SATELLITE LINK','ANTENNA'],'Illustrative demo feed.','Communications assets represent ground-station and satellite-link workflows.'],
    'power': ['POWER / ENERGY SYSTEM','DEMO / NO LIVE DATA','DEMO WATCH',['GENERATOR','FUEL','LOAD','BACKUP'],'Illustrative demo feed.','Energy infrastructure is represented for station-readiness monitoring.'],
    'runway': ['RUNWAY / ACCESS','DEMO / MONITORED','DEMO WATCH',['RUNWAY','ACCESS ROAD','FIELD OPS'],'Illustrative demo feed.','Runway and access are mapped for field movement and planning.'],
    'heritage': ['HERITAGE SITE','DEMO / TRACKED','DEMO WATCH',['STRUCTURE','DOCUMENTATION','PRESERVATION'],'Illustrative demo feed.','Heritage assets are represented for preservation logging.'],
    'satellite-a': ['SATELLITE A','DEMO / PASS SCHEDULED','DEMO WATCH',['TTC','PASS','RF LINK'],'Illustrative orbital feed.','Satellite A is an orbital linkage for mission-control interaction.'],
    'satellite-b': ['SATELLITE B','DEMO / PASS SCHEDULED','DEMO WATCH',['TTC','PASS','RF LINK'],'Illustrative orbital feed.','Satellite B is an orbital linkage for mission-control interaction.']
  };

  const state = { selected:'main-station', zoom:1, panX:0, panY:0, dragging:false, startX:0, startY:0, startPanX:0, startPanY:0, telemetry:{}, layers:{satellites:true,risk:false,weather:true,wind:true,infrastructure:true,access:true,heritage:true,lidar:false} };
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const stage = q('#mapStage');
  const mapWrapper = q('#mapWrapper');
  const svg = q('#digitalTwin');
  const drawer = q('#assetDrawer');
  const modal = q('#detailModal');

  function setText(id, value){ const el=q(id); if(el) el.textContent=value; }
  function updateDrawer(key){
    const a=assetData[key]||assetData['main-station'];
    setText('#asset-title',a[0]); setText('#asset-status',a[1]); setText('#asset-risk',a[2]); setText('#asset-observation','DEMO TRACE: AWAITING TELEMETRY'); setText('#asset-last-check','DEMO: '+new Date().toISOString().slice(11,16)+' UTC'); setText('#asset-source',a[4]); setText('#asset-context-note',a[5]);
    const tag=q('#asset-status-tag'); if(tag) tag.textContent=a[1];
    const list=q('#asset-systems'); if(list) list.innerHTML=a[3].map(x=>`<li>${x}</li>`).join('');
    if(drawer) drawer.classList.remove('collapsed');
  }
  function selectAsset(key,focus=false){
    if(!assetData[key]) return;
    state.selected=key;
    qa('.asset-group').forEach(el=>el.classList.toggle('selected',el.dataset.asset===key));
    updateDrawer(key);
    if(focus) focusAsset(key);
  }
  function focusAsset(key){
    const el=q(`.asset-group[data-asset="${key}"]`); if(!el||!svg) return;
    const b=el.getBBox(), vb=svg.viewBox.baseVal;
    const scale=(svg.clientWidth || mapWrapper?.clientWidth || vb.width)/vb.width;
    state.zoom=Math.max(state.zoom,1.2);
    state.panX=(mapWrapper?.clientWidth || svg.clientWidth)/2-(b.x+b.width/2)*scale*state.zoom;
    state.panY=(mapWrapper?.clientHeight || svg.clientHeight)/2-(b.y+b.height/2)*scale*state.zoom;
    updateTransform();
  }
  function updateTransform(){
    if(stage) stage.style.transform=`translate3d(${state.panX}px,${state.panY}px,0) scale(${state.zoom})`;
    setText('#sceneZoomReadout',`ZOOM ${Math.round(state.zoom*100)}%`);
  }
  function openModule(view){
    if(view==='infrastructure'){
      closeModule();
      window.Polaris3DReset?.();
      document.querySelector('#mapWrapper')?.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    const cfg={
      'ground-station':['ground','GROUND STATION & DRS MISSION CONTROL'],
      meteorology:['meteorology','METEOROLOGY & ATMOSPHERIC RESILIENCE'],
      compliance:['compliance','REGULATORY & ENVIRONMENTAL COMPLIANCE'],
      'well-being':['wellbeing','WINTER-OVER WELL-BEING HUB'],
      infrastructure:['infrastructure','INFRASTRUCTURE & HERITAGE TRACKER']
    }[view];
    if(!cfg||!modal) return;
    const title=q('#detailTitle'); const frame=q('#detailFrame');
    if(title) title.textContent=cfg[1];
    if(frame) frame.src=`legacy-operations.html?module=${cfg[0]}&ui=aligned`;
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
  }
  function closeModule(){ if(!modal)return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }
  function setLayer(layer){
    state.layers[layer]=!state.layers[layer];
    const btn=q(`[data-layer="${layer}"]`); if(btn) btn.classList.toggle('active',state.layers[layer]);
    applyLayers();
  }
  function applyLayers(){
    qa('.layer-group').forEach(g=>{
      const names=(g.dataset.layers||'').split(/\s+/).filter(Boolean); if(names.length) g.style.display=names.some(n=>state.layers[n]===false)?'none':'';
    });
  }
  function addObservation(){
    const note=window.prompt('Add an observation note for the selected asset:','Observation logged: awaiting field validation');
    if(!note)return; const el=document.createElement('div'); el.className='log-entry'; el.textContent=`${assetData[state.selected][0]} — ${note}`; q('#observationLog')?.prepend(el);
  }
  function getPowerState(data=state.telemetry){
    const severe=data?.risk==='HIGH'||data?.risk==='CRITICAL'||Number(data?.wind_speed)>=70||Number(data?.temperature)<=-35||Number(data?.pressure)>0&&Number(data?.pressure)<945;
    return {active:severe,reason:severe?'Severe weather protection protocol engaged.':'Normal operating conditions.'};
  }
  function metric(label,value,detail=''){return `<div class="ops-metric"><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`;}
  function renderOps(panel){
    const d=state.telemetry||{}; const power=getPowerState(d); const factors=d.risk_factors?.length?d.risk_factors:['No active risk factors'];
    const views={
      stats:{title:'VIEW STATS',content:`<div class="ops-grid">${metric('SENSOR HEALTH',d.status==='LIVE MQTT'?'98%':'DEMO','MQTT telemetry quality')}${metric('TEMPERATURE',d.temperature==null?'NO DATA':`${Number(d.temperature).toFixed(1)} °C`,'Ambient station sensor')}${metric('HUMIDITY',d.humidity==null?'NO DATA':`${Number(d.humidity).toFixed(0)} %`,'Relative humidity')}${metric('WIND',d.wind_speed==null?'NO DATA':`${Number(d.wind_speed).toFixed(1)} km/h`,d.wind_direction?`Direction ${d.wind_direction}`:'Wind speed')}${metric('PRESSURE',d.pressure==null?'NO DATA':`${Number(d.pressure).toFixed(0)} hPa`,'Atmospheric pressure')}${metric('RISK',d.risk||'NO DATA',`Score ${d.risk_score??'--'}`)}</div><div class="ops-section"><h3>LAST TELEMETRY</h3><p>${d.timestamp?new Date(d.timestamp).toLocaleString():'Waiting for telemetry'} · ${d.source||'Demo feed'}</p></div>`},
      mqtt:{title:'DATA TRANSFER // MQTT',content:`<div class="ops-grid">${metric('PROTOCOL','MQTT','Message transport')}${metric('LINK',d.status==='LIVE MQTT'?'CONNECTED':'STANDBY','Broker connection')}${metric('TOPIC','antarctica/maitri','Telemetry channel')}</div><div class="ops-section"><h3>TRANSFER POLICY</h3><p>Telemetry is published through the station MQTT bridge and relayed to the browser through HTTP fallback or WebSocket streaming.</p><ul><li>QoS 1 for operational readings</li><li>Retained latest state for reconnects</li><li>Priority queue reserved for alerts</li></ul></div>`},
      power:{title:'POWER SAVING MODE',content:`<div class="ops-grid">${metric('MODE',power.active?'ACTIVE':'STANDBY',power.active?'Load protection enabled':'Full station profile')}${metric('TRIGGER',power.active?'SEVERE CONDITIONS':'NONE',power.reason)}${metric('EST. LOAD',power.active?'62%':'100%','Relative draw target')}</div><div class="ops-section"><h3>CONDITIONAL POLICY</h3><p>Power saving engages when risk reaches HIGH or CRITICAL, wind reaches 70 km/h, temperature reaches -35 °C, or pressure drops below 945 hPa.</p><div class="ops-bar"><i class="${power.active?'warning':''}" style="width:${power.active?'62':'100'}%"></i></div></div>`},
      alerts:{title:'ALERTS // STATION WATCH',content:`<div class="ops-grid">${metric('ACTIVE ALERTS',power.active?factors.length:'0',power.active?'Review risk factors':'No active alerts')}${metric('RISK LEVEL',d.risk||'NO DATA','Rule-engine assessment')}${metric('QUEUE','PRIORITY','Alert delivery class')}</div><div class="ops-section"><h3>ALERT REGISTER</h3><ul>${factors.map(factor=>`<li>${factor}</li>`).join('')}</ul></div>`},
      upcoming:{title:'UPCOMING FEATURES',content:`<div class="ops-section"><h3>PREDICTIVE DATA TRANSFER</h3><p>A planned ML layer will forecast link quality, weather disruption, and sensor importance to prioritize critical packets before bandwidth degrades.</p><ul><li>Predictive weather-window scoring</li><li>Priority data transfer for alerts and safety telemetry</li><li>Adaptive MQTT queue weighting</li><li>Operator review before automated policy changes</li></ul></div><div class="ops-section"><h3>ROADMAP STATUS</h3><div class="ops-bar"><i style="width:28%"></i></div><p>Prototype planning · 28% defined</p></div>`}
    };
    const view=views[panel]||views.stats; setText('#opsTitle',view.title); const content=q('#opsContent'); if(content) content.innerHTML=view.content;
    q('#opsModal')?.classList.add('open'); q('#opsModal')?.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
  }
  function closeOps(){q('#opsModal')?.classList.remove('open');q('#opsModal')?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}

  qa('.asset-group').forEach(el=>{
    el.addEventListener('click',e=>{ e.stopPropagation(); if(state.dragMoved) return; selectAsset(el.dataset.asset,false); });
    el.addEventListener('mouseenter',e=>showTip(e,el.dataset.asset)); el.addEventListener('mousemove',e=>showTip(e,el.dataset.asset)); el.addEventListener('mouseleave',hideTip);
  });
  function showTip(e,key){ const t=q('#assetTooltip'); if(!t||!stage)return; const a=assetData[key]; const r=stage.getBoundingClientRect(); t.style.left=Math.min(Math.max(e.clientX-r.left+14,12),r.width-190)+'px'; t.style.top=Math.min(Math.max(e.clientY-r.top+14,12),r.height-70)+'px'; t.innerHTML=`<strong>${a[0]}</strong><span>${a[1]}</span>`; t.classList.add('show'); }
  function hideTip(){q('#assetTooltip')?.classList.remove('show');}
  qa('.satellite-node').forEach(el=>el.addEventListener('click',()=>{state.layers.satellites=true;q('[data-layer="satellites"]')?.classList.add('active');qa('[data-layer-group]');selectAsset(el.dataset.asset,false);}));
  qa('.layer-btn').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.layer)));
  qa('.timeline-item').forEach(b=>b.addEventListener('click',()=>{qa('.timeline-item').forEach(x=>x.classList.toggle('active',x===b));selectAsset(b.dataset.focus==='weather'?'weather':b.dataset.focus,true);}));
  qa('[data-action]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.action;if(a==='zoom-in')state.zoom=Math.min(2.2,state.zoom+.15);if(a==='zoom-out')state.zoom=Math.max(.7,state.zoom-.15);if(a==='reset'){state.zoom=1;state.panX=0;state.panY=0;}updateTransform();}));
  qa('.ops-button').forEach(b=>b.addEventListener('click',()=>{const pages={stats:'index-stats.html',mqtt:'index-mqtt.html',power:'index-power.html',alerts:'index-alerts.html',upcoming:'index-upcoming.html'};if(pages[b.dataset.panel]) window.location.href=pages[b.dataset.panel];else renderOps(b.dataset.panel);}));
  qa('.nav-item').forEach(b=>b.addEventListener('click',()=>{qa('.nav-item').forEach(x=>x.classList.toggle('active',x===b));openModule(b.dataset.view);}));
  qa('.subsystem').forEach(b=>b.addEventListener('click',()=>openModule(b.dataset.view)));
  q('#openDetailedButton')?.addEventListener('click',()=>openModule(state.selected==='weather'?'meteorology':'ground-station'));
  q('#closeDetail')?.addEventListener('click',closeModule); q('#detailBackdrop')?.addEventListener('click',closeModule); q('#closeOps')?.addEventListener('click',closeOps); q('#opsBackdrop')?.addEventListener('click',closeOps); q('#closeDrawer')?.addEventListener('click',()=>drawer?.classList.add('collapsed')); q('#addObservationButton')?.addEventListener('click',addObservation);
  stage?.addEventListener('pointerdown',e=>{state.dragging=true;state.dragMoved=false;state.startX=e.clientX;state.startY=e.clientY;state.startPanX=state.panX;state.startPanY=state.panY;stage.setPointerCapture?.(e.pointerId);stage.classList.add('dragging');});
  window.addEventListener('pointermove',e=>{if(!state.dragging)return;const dx=e.clientX-state.startX,dy=e.clientY-state.startY;state.dragMoved=state.dragMoved||Math.hypot(dx,dy)>4;state.panX=state.startPanX+dx;state.panY=state.startPanY+dy;updateTransform();});
  window.addEventListener('pointerup',()=>{state.dragging=false;stage?.classList.remove('dragging');});
  window.addEventListener('pointercancel',()=>{state.dragging=false;stage?.classList.remove('dragging');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModule();closeOps();}if(e.key==='0'){state.zoom=1;state.panX=0;state.panY=0;updateTransform();}});
  window.addEventListener('polaris:telemetry',event=>{state.telemetry=event.detail||{};const power=getPowerState(state.telemetry);setText('#powerModeLabel',power.active?'ACTIVE':'STANDBY');const dot=q('#powerModeDot');if(dot)dot.className=`ops-status-dot ${power.active?'warning':''}`;setText('#alertCount',power.active?String(state.telemetry.risk_factors?.length||1):'0');});
  function updateClock(){setText('#utcClock',new Date().toISOString().slice(11,19)+' UTC');} updateClock();setInterval(updateClock,1000);
  async function checkBackend(){try{const r=await fetch('/api/health',{cache:'no-store'});if(!r.ok)throw 0;const p=await r.json();setText('#backendMode',p.mqtt_connected?'LIVE MQTT':'API ONLINE / MQTT WAITING');}catch{setText('#backendMode','DEMO MODE');}}
  checkBackend(); setInterval(checkBackend,5000);
  qa('.layer-btn').forEach(b=>b.classList.toggle('active',state.layers[b.dataset.layer]));
  applyLayers(); selectAsset('main-station'); updateTransform();
  window.PolarisSelectAsset = selectAsset;
})();
