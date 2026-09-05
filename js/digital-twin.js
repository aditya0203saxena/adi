(() => {
  function format(value, digits = 1, suffix = '') {
    return value === null || value === undefined || value === '' ? 'NO DATA' : `${Number(value).toFixed(digits)}${suffix}`;
  }
  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }
  function setRiskClass(level) {
    const root = document.querySelector('.scene-stage');
    if (root) root.dataset.risk = String(level || 'NO DATA').toLowerCase();
  }
  function updateTwin(data, transport) {
    const live = data?.status === 'LIVE MQTT';
    setText('#telemetryConnection', live ? `LIVE // ${transport}` : `STANDBY // ${transport}`);
    setText('#telemetryTemp', format(data?.temperature, 1, ' °C'));
    setText('#telemetryWind', format(data?.wind_speed, 1, ' km/h'));
    setText('#telemetryPressure', format(data?.pressure, 0, ' hPa'));
    setText('#telemetryHumidity', format(data?.humidity, 0, ' %'));
    setText('#telemetryRisk', data?.risk || 'NO DATA');
    setText('#telemetrySource', data?.source || 'Awaiting telemetry');
    setText('#telemetryTime', data?.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');
    setRiskClass(data?.risk);
    document.querySelectorAll('.risk-label').forEach((node) => { node.textContent = data?.risk || 'NO DATA'; });
    const weather = document.querySelector('[data-asset="weather"]');
    if (weather) {
      weather.classList.toggle('live-asset', live);
      weather.setAttribute('aria-label', live ? `Live weather station: ${format(data?.temperature, 1, ' °C')}, wind ${format(data?.wind_speed, 1, ' km/h')}` : 'Weather station');
    }
  }
  function start() {
    if (!window.PolarisTelemetry) return;
    window.PolarisTelemetry.subscribe((data, state) => updateTwin(data, state.transport));
    window.PolarisTelemetry.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
