(() => {
  const state = { latest: {}, transport: 'OFFLINE' };
  const q = (selector) => document.querySelector(selector);
  const text = (selector, value) => { const node = q(selector); if (node) node.textContent = value; };
  const value = (input, suffix = '') => input === null || input === undefined ? 'NO DATA' : `${input}${suffix}`;
  const isSevere = (data) => data?.risk === 'HIGH' || data?.risk === 'CRITICAL' || Number(data?.wind_speed) >= 70 || Number(data?.temperature) <= -35 || (Number(data?.pressure) > 0 && Number(data?.pressure) < 945);
  function update(data, telemetryState) {
    state.latest = data || {}; state.transport = telemetryState.transport;
    const severe = isSevere(state.latest);
    text('#featureBackend', state.latest.status === 'LIVE MQTT' ? `LIVE // ${state.transport}` : 'DEMO / OFFLINE');
    text('#featureClock', new Date().toISOString().slice(11, 19) + ' UTC');
    text('[data-stat="temperature"]', value(data.temperature, ' °C'));
    text('[data-stat="humidity"]', value(data.humidity, ' %'));
    text('[data-stat="wind"]', value(data.wind_speed, ' km/h'));
    text('[data-stat="pressure"]', value(data.pressure, ' hPa'));
    text('[data-stat="risk"]', data.risk || 'NO DATA');
    text('[data-stat="score"]', data.risk_score ?? '--');
    text('[data-stat="transport"]', telemetryState.transport);
    text('[data-stat="power"]', severe ? 'ACTIVE' : 'STANDBY');
    text('[data-stat="alerts"]', severe ? String(data.risk_factors?.length || 1) : '0');
    const mode = q('[data-power-state]'); if (mode) { mode.textContent = severe ? 'POWER SAVING ACTIVE' : 'NORMAL OPERATING MODE'; mode.classList.toggle('warning', severe); mode.classList.toggle('critical', data.risk === 'CRITICAL'); }
    const factors = q('[data-alert-list]'); if (factors) factors.innerHTML = (data.risk_factors?.length ? data.risk_factors : ['No active alerts']).map(item => `<li>${item}</li>`).join('');
    document.querySelectorAll('[data-risk-meter]').forEach((meter) => { const score = Math.min(100, Number(data.risk_score || 0) * 10); meter.style.width = `${score}%`; meter.className = data.risk === 'CRITICAL' ? 'critical' : severe ? 'warning' : ''; });
  }
  function init() {
    const page = document.body.dataset.page;
    document.querySelectorAll('[data-page-link]').forEach(link => link.classList.toggle('active', link.dataset.pageLink === page));
    if (window.PolarisTelemetry) { window.PolarisTelemetry.subscribe(update); window.PolarisTelemetry.start(); }
    document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
