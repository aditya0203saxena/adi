(() => {
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => [...r.querySelectorAll(s)];
  const state = {
    connected:false, source:'DEMO', telemetry:{}, risk:'NO DATA', score:null, factors:[], selected:'main-station', zoom:1, panX:0, panY:0, drag:false,
    history:{temperature:[],wind:[],pressure:[],humidity:[]}, scenario:null
  };
  const ASSETS={
    'main-station':{name:'Maitri Research Station',type:'CORE',systems:['thermal','power','life-support']},
    weather:{name:'Meteorological Node',type:'MET',systems:['temperature','wind','humidity','pressure']},
    power:{name:'Energy Plant',type:'POWER',systems:['generation','fuel','load']},
    communications:{name:'RF / Communications',type:'COMMS',systems:['satcom','hf','ttc']},
    runway:{name:'Runway / Access',type:'ACCESS',systems:['surface','visibility','field-ops']},
    heritage:{name:'Heritage Site',type:'HERITAGE',systems:['condition','documentation']},
    'satellite-a':{name:'Satellite A Link',type:'ORBIT',systems:['pass','link','ttc']},
    'satellite-b':{name:'Satellite B Link',type:'ORBIT',systems:['pass','link','ttc']}
  };
  const SCENARIOS=[
    {id:'cold-snap',name:'COLD SNAP',desc:'Temperature −10°C',temp:-10,wind:0,load:1.08},
    {id:'blizzard',name:'BLIZZARD',desc:'Wind +35 km/h',temp:-3,wind:35,load:1.15},
    {id:'power-cut',name:'POWER LOSS',desc:'Primary generation −25%',temp:0,wind:0,load:0.75},
    {id:'safe-mode',name:'SAFE MODE',desc:'Non-critical loads reduced',temp:0,wind:0,load:0.62}
  ];

  function text(id,v){const e=q('#'+id);if(e)e.textContent=v}
  function n(v,f=0){const x=Number(v);return Number.isFinite(x)?x:f}
  function fmt(v,unit='',digits=1){return Number.isFinite(Number(v))?`${n(v).toFixed(digits)}${unit}`:'—'}
  function riskClass(level){level=(level||'').toUpperCase();return level==='CRITICAL'?'bad':level==='HIGH'?'warn':''}
  function setBackend(connected, source){state.connected=connected;state.source=source||'DEMO';const dot=q('#connDot');if(dot)dot.className=`dot ${connected?'live':''}`;text('connectionText',connected?'LIVE MQTT':'DEMO / NO BACKEND');text('backendMode',connected?'LIVE':'DEMO')}

  function classifyRisk(d){
    let score=0,f=[];const temp=n(d.temperature,0),wind=n(d.wind_speed,0),pressure=n(d.pressure,0),humidity=n(d.humidity,0);
    if(temp<=-35){score+=35;f.push('Extreme cold load')} else if(temp<=-25){score+=18;f.push('Severe cold')}
    if(wind>=70){score+=35;f.push('Blizzard-level wind')} else if(wind>=50){score+=20;f.push('High wind')}
    if(pressure&&pressure<945){score+=20;f.push('Low atmospheric pressure')}
    if(humidity>=90){score+=8;f.push('High humidity / icing potential')}
    const level=score>=55?'CRITICAL':score>=32?'HIGH':score>=15?'MEDIUM':'LOW';
    return {level,score,factors:f}
  }

  function applyTelemetry(d){
    state.telemetry={...state.telemetry,...d};
    const r=d.risk?{level:d.risk,score:d.risk_score,factors:d.risk_factors||[]}:classifyRisk(state.telemetry);
    state.risk=r.level||'NO DATA';state.score=Number.isFinite(Number(r.score))?Number(r.score):null;state.factors=r.factors||[];
    const time=d.timestamp?new Date(d.timestamp):new Date();
    const add=(k,v)=>{if(v==null||!Number.isFinite(Number(v)))return;state.history[k].push({t:time.getTime(),v:Number(v)});state.history[k]=state.history[k].slice(-28)};
    add('temperature',d.temperature);add('wind',d.wind_speed);add('pressure',d.pressure);add('humidity',d.humidity);
    render();
    window.dispatchEvent(new CustomEvent('polaris:telemetry',{detail:state.telemetry}));
  }

  function metric(id,label,value,detail){const e=q('#'+id);if(!e)return;text(`${id}Label`,label);text(`${id}Value`,value);text(`${id}Detail`,detail||'')}
  function render(){
    const d=state.telemetry,r=state.risk,cls=riskClass(r);
    text('tempValue',fmt(d.temperature,' °C'));text('windValue',fmt(d.wind_speed,' km/h'));text('pressureValue',fmt(d.pressure,' hPa',0));text('humidityValue',fmt(d.humidity,' %',0));
    text('riskValue',r);text('riskScore',state.score==null?'—':state.score.toFixed(0));
    const rb=q('#riskBadge');if(rb){rb.textContent=`${r} ${state.score==null?'':'· '+state.score}`;rb.className=`state-badge ${cls}`}
    const bar=q('#riskBar i');if(bar)bar.style.width=`${Math.min(100,Math.max(0,state.score??0))}%`;
    const health=q('#healthBar i');if(health)health.style.width=`${state.connected?96:54}%`;
    text('healthValue',state.connected?'96%':'54%');text('lastSource',d.source||state.source||'Demo feed');
    const f=q('#riskFactors');if(f)f.innerHTML=(state.factors.length?state.factors:['No active risk factors']).map(x=>`<div class="factor">${x}</div>`).join('');
    text('assetName',ASSETS[state.selected]?.name||'Maitri Research Station');text('assetType',ASSETS[state.selected]?.type||'CORE');
    renderTrend();renderTimeline();
    const power=state.score!=null&&state.score>=32?'PROTECTED':'NORMAL';text('powerValue',power);text('stateValue',state.connected?'SYNCHRONIZED':'SIMULATION READY');
    q('#stateBadge')?.classList.toggle('warn',power==='PROTECTED');q('#stateBadge')?.classList.toggle('bad',r==='CRITICAL');
  }

  function renderTrend(){
    const host=q('#trendSvg');if(!host)return;
    const vals=state.history.temperature.length?state.history.temperature.map(x=>x.v):[-24,-23,-25,-24,-22,-24,-23];
    const w=host.clientWidth||620,h=115,p=12,min=Math.min(...vals)-2,max=Math.max(...vals)+2,span=Math.max(1,max-min);
    const pts=vals.map((v,i)=>`${p+(w-2*p)*(i/Math.max(1,vals.length-1))},${h-p-(h-2*p)*((v-min)/span)}`).join(' ');
    host.setAttribute('viewBox',`0 0 ${w} ${h}`);host.innerHTML=`<path d="M${p} ${h-p}H${w-p}" stroke="rgba(159,203,221,.08)"/><polyline points="${pts}" fill="none" stroke="#58e2d0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="18">TEMP HISTORY</text><text x="${w-72}" y="18">°C / 28 PT</text>`;
  }

  function renderTimeline(){
    const list=q('#eventTimeline');if(!list)return;
    const now=new Date();const entries=[
      ['NOW',state.connected?'Telemetry synchronized':'Demo state active',state.connected?'MQTT → Twin state':'Local twin engine'],
      ['MODEL',state.scenario?`Scenario: ${state.scenario.name}`:'Baseline state',state.scenario?'What-if simulation':'Live / demo'],
      ['RISK',state.risk||'NO DATA',state.factors[0]||'No active factor']
    ];
    list.innerHTML=entries.map(e=>`<div class="event"><time>${e[0]}</time><div><b>${e[1]}</b><span>${e[2]}</span></div></div>`).join('');
  }

  function runScenario(sc){
    const d={...state.telemetry};d.temperature=n(d.temperature,-20)+sc.temp;d.wind_speed=Math.max(0,n(d.wind_speed,35)+sc.wind);d.pressure=n(d.pressure,980);d.humidity=n(d.humidity,65);
    const r=classifyRisk(d);const thermalPenalty=Math.max(0,(-18-d.temperature))*0.9;const windPenalty=Math.max(0,(d.wind_speed-35))*0.45;const energy=Math.max(20,Math.min(100,68+thermalPenalty+windPenalty));const resilience=Math.max(5,Math.min(100,100-r.score*0.9));
    state.scenario=sc;const host=q('#simulationResult');if(host)host.innerHTML=`<strong>${sc.name}</strong><div class="sim-row"><span>Predicted risk</span><b>${r.level} · ${r.score}</b></div><div class="sim-row"><span>Relative energy load</span><b>${energy.toFixed(0)}%</b></div><div class="sim-row"><span>Operational resilience</span><b>${resilience.toFixed(0)}%</b></div><div class="sim-row"><span>Primary factor</span><b>${r.factors[0]||'None'}</b></div>`;
    text('simStatus',`SCENARIO // ${sc.name}`);toast(`${sc.name} simulated against current twin state`);renderTimeline();
  }

  function toast(msg){const e=q('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(window.__pt);window.__pt=setTimeout(()=>e.classList.remove('show'),2300)}
  function selectAsset(key){state.selected=key;qa('.asset').forEach(e=>e.classList.toggle('selected',e.dataset.asset===key));render()}

  function setupSVG(){
    const svg=q('#twinSvg'),stage=q('#twinStage');if(!svg||!stage)return;
    qa('.asset').forEach(e=>e.addEventListener('click',ev=>{ev.stopPropagation();selectAsset(e.dataset.asset)}));
    stage.addEventListener('pointerdown',e=>{state.drag=true;state.sx=e.clientX;state.sy=e.clientY;state.spX=state.panX;state.spY=state.panY;stage.classList.add('dragging');stage.setPointerCapture?.(e.pointerId)});
    window.addEventListener('pointermove',e=>{if(!state.drag)return;state.panX=state.spX+e.clientX-state.sx;state.panY=state.spY+e.clientY-state.sy;updateScene()});
    window.addEventListener('pointerup',()=>{state.drag=false;stage.classList.remove('dragging')});
    q('#zoomIn')?.addEventListener('click',()=>{state.zoom=Math.min(1.8,state.zoom+.1);updateScene()});q('#zoomOut')?.addEventListener('click',()=>{state.zoom=Math.max(.75,state.zoom-.1);updateScene()});q('#resetScene')?.addEventListener('click',()=>{state.zoom=1;state.panX=0;state.panY=0;updateScene();toast('Scene reset')});
  }
  function updateScene(){const inner=q('#twinScene');if(inner)inner.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;text('zoomValue',`${Math.round(state.zoom*100)}%`)}

  function setupUI(){
    qa('.nav button').forEach(b=>b.addEventListener('click',()=>{qa('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const view=b.dataset.view;if(view==='simulate')openModal('simulate');else if(view==='modules')toast('Five operational modules stay connected to the shared twin state');else if(view==='data')openModal('data');else if(view==='assets')toast('Select any asset in the twin to inspect its state');else toast(`${b.querySelector('.nav-title')?.textContent||view} view selected`)}));
    qa('.scenario').forEach(b=>b.addEventListener('click',()=>runScenario(SCENARIOS.find(x=>x.id===b.dataset.scenario)||SCENARIOS[0])));
    q('#simulateBtn')?.addEventListener('click',()=>openModal('simulate'));q('#dataBtn')?.addEventListener('click',()=>openModal('data'));q('#moduleBtn')?.addEventListener('click',()=>window.location.href='legacy-operations.html?module=ground&ui=aligned');q('#syncBtn')?.addEventListener('click',()=>connect());q('#closeModal')?.addEventListener('click',closeModal);q('#modalBackdrop')?.addEventListener('click',closeModal);
    q('#modal')?.addEventListener('click',e=>{const b=e.target.closest('[data-modal-action]');if(!b)return;if(b.dataset.modalAction==='scenario'){runScenario(SCENARIOS.find(x=>x.id===b.dataset.id)||SCENARIOS[0]);return}if(b.dataset.modalAction==='data'){toast('Using the same normalized state contract for MQTT, HTTP fallback, and simulation')} });
  }
  function openModal(type){const m=q('#modal'),title=q('#modalTitle'),body=q('#modalBody');if(!m||!title||!body)return;if(type==='simulate'){title.textContent='SCENARIO LAB // WHAT-IF SIMULATION';body.innerHTML=`<p class="muted">The scenario engine perturbs the synchronized twin state and estimates risk, relative energy demand and resilience. It is a prototype decision-support model, not an operational safety limit.</p><div class="scenario-grid">${SCENARIOS.map(s=>`<button class="scenario" data-modal-action="scenario" data-id="${s.id}"><strong>${s.name}</strong><small>${s.desc}</small></button>`).join('')}</div><div id="simulationResult" class="simulation-result">Choose a scenario to run it against the current state.</div>`}else{title.textContent='DATA & TWIN CONTRACT';body.innerHTML=`<div class="form-grid"><div class="field"><label>PHYSICAL SOURCE</label><strong>MQTT / ESP32 / WEATHER</strong></div><div class="field"><label>TWIN STATE</label><strong>Synchronized normalized JSON</strong></div><div class="field"><label>TOPIC</label><strong>antarctica/maitri/telemetry</strong></div><div class="field"><label>FALLBACK</label><strong>/api/telemetry + /api/health</strong></div></div><p class="muted" style="margin-top:12px">The browser never needs broker credentials. The backend is the MQTT boundary; the UI consumes a normalized state stream.</p>`}m.classList.add('open');m.setAttribute('aria-hidden','false')}
  function closeModal(){const m=q('#modal');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true')}

  async function connect(){
    let got=false;
    try{const r=await fetch('/api/telemetry',{cache:'no-store'});if(r.ok){applyTelemetry(await r.json());got=true}}
    catch(_){/* fallback */}
    try{const wsProto=location.protocol==='https:'?'wss':'ws',ws=new WebSocket(`${wsProto}://${location.host}/ws`);ws.onopen=()=>setBackend(true,'MQTT / WebSocket');ws.onmessage=e=>{try{applyTelemetry(JSON.parse(e.data));got=true}catch(_){}};ws.onerror=()=>setBackend(false,'DEMO');window.__polarisWS=ws}
    catch(_){setBackend(false,'DEMO')}
    if(!got)setBackend(false,'DEMO')
  }

  window.POLARIS_TWIN={state,applyTelemetry,runScenario,selectAsset,connect};
  setupSVG();setupUI();render();connect();
  window.addEventListener('resize',renderTrend);
  setInterval(()=>{if(!state.connected){const base=state.telemetry.temperature==null?-22:n(state.telemetry.temperature,-22);applyTelemetry({temperature:base+((Date.now()/5000)%2-1)*.15,wind_speed:n(state.telemetry.wind_speed,28),pressure:n(state.telemetry.pressure,979),humidity:n(state.telemetry.humidity,65),status:'DEMO',source:'POLARIS local simulation',timestamp:new Date().toISOString()})}},4000);
})();
