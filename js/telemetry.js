(() => {
  const state = { connected: false, transport: 'OFFLINE', latest: null, listeners: new Set(), reconnectTimer: null };

  const normalize = (payload) => ({
    status: payload.status ?? 'NO DATA',
    source: payload.source ?? 'Awaiting telemetry',
    temperature: payload.temperature ?? null,
    wind_speed: payload.wind_speed ?? null,
    wind_direction: payload.wind_direction ?? null,
    pressure: payload.pressure ?? null,
    humidity: payload.humidity ?? null,
    risk: payload.risk ?? 'NO DATA',
    risk_score: payload.risk_score ?? null,
    risk_factors: Array.isArray(payload.risk_factors) ? payload.risk_factors : [],
    timestamp: payload.timestamp ?? payload.received_at ?? null,
  });

  function emit(payload) {
    state.latest = normalize(payload);
    state.listeners.forEach((listener) => {
      try { listener(state.latest, state); } catch (error) { console.error('[Telemetry] listener error', error); }
    });
  }

  async function poll() {
    try {
      const response = await fetch('/api/telemetry', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      emit(await response.json());
      state.connected = true;
      state.transport = 'HTTP';
      return true;
    } catch (error) {
      state.connected = false;
      state.transport = 'OFFLINE';
      return false;
    }
  }

  function connectWebSocket() {
    if (location.protocol === 'file:') return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.addEventListener('open', () => { state.connected = true; state.transport = 'WEBSOCKET'; socket.send('hello'); });
    socket.addEventListener('message', (event) => { try { emit(JSON.parse(event.data)); } catch (error) { console.error('[Telemetry] invalid WS payload', error); } });
    socket.addEventListener('close', () => {
      state.connected = false;
      state.transport = 'OFFLINE';
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(connectWebSocket, 3000);
    });
    socket.addEventListener('error', () => socket.close());
  }

  window.PolarisTelemetry = {
    subscribe(listener) {
      state.listeners.add(listener);
      if (state.latest) listener(state.latest, state);
      return () => state.listeners.delete(listener);
    },
    getState() { return state; },
    start() {
      poll();
      connectWebSocket();
      setInterval(() => { if (!state.connected || state.transport !== 'WEBSOCKET') poll(); }, 5000);
    },
  };
})();
