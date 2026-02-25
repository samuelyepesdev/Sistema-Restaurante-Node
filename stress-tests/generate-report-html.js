/**
 * Genera report.html a partir del report.json de Artillery.
 * Artillery deprecó "artillery report"; este script reemplaza esa funcionalidad en local.
 *
 * Uso: node stress-tests/generate-report-html.js [ruta/report.json]
 * Por defecto usa: stress-tests/reports/report.json
 */

const fs = require('fs');
const path = require('path');

const defaultInput = path.join(__dirname, 'reports', 'report.json');
const inputPath = process.argv[2] || defaultInput;
const outputPath = inputPath.replace(/\.json$/i, '.html');

if (!fs.existsSync(inputPath)) {
    console.error('No se encontró:', inputPath);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const agg = data.aggregate || {};
const counters = agg.counters || {};
const summaries = agg.summaries || {};
const histograms = agg.histograms || {};
const intermediate = data.intermediate || [];

const firstAt = agg.firstCounterAt || 0;
const lastAt = agg.lastCounterAt || firstAt;
const durationSec = Math.max(0, (lastAt - firstAt) / 1000);

const vusersCreated = counters['vusers.created'] ?? 0;
const vusersFailed = counters['vusers.failed'] ?? 0;
const vusersCompleted = vusersCreated - vusersFailed;

const errors = Object.entries(counters)
    .filter(([k]) => k.startsWith('errors.'))
    .map(([k, v]) => ({ name: k.replace('errors.', ''), count: v }));
const totalErrors = errors.reduce((s, e) => s + e.count, 0);

let latencyHtml = '';
const responseTime = summaries['http.response_time'] || histograms['http.response_time'];
if (responseTime && typeof responseTime === 'object') {
    const min = responseTime.min != null ? responseTime.min.toFixed(0) : '-';
    const max = responseTime.max != null ? responseTime.max.toFixed(0) : '-';
    const median = responseTime.median != null ? responseTime.median.toFixed(0) : '-';
    const p95 = responseTime.p95 != null ? responseTime.p95.toFixed(0) : '-';
    const p99 = responseTime.p99 != null ? responseTime.p99.toFixed(0) : '-';
    latencyHtml = `
    <h2>Latencia (ms)</h2>
    <table class="metrics">
      <tr><th>Min</th><th>Mediana</th><th>P95</th><th>P99</th><th>Max</th></tr>
      <tr><td>${min}</td><td>${median}</td><td>${p95}</td><td>${p99}</td><td>${max}</td></tr>
    </table>`;
}

const scenarioCounts = Object.entries(counters)
    .filter(([k]) => k.startsWith('vusers.created_by_name.'))
    .map(([k, v]) => ({ name: k.replace('vusers.created_by_name.', ''), count: v }));

const requestsPerSec = durationSec > 0 ? (vusersCompleted / durationSec).toFixed(1) : '0';
const errorRate = vusersCreated > 0 ? ((totalErrors / (vusersCreated * 5)) * 100).toFixed(1) : '0';

const labels = intermediate.map((_, i) => i);
const createdData = intermediate.map((s) => s.counters?.['vusers.created'] ?? 0);
const failedData = intermediate.map((s) => s.counters?.['vusers.failed'] ?? 0);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reporte de estrés - Artillery</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; background: #1a1a2e; color: #eee; }
    h1 { color: #e94560; margin-top: 0; }
    h2 { color: #a2d2ff; font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
    .metrics { border-collapse: collapse; margin: 0.5rem 0; }
    .metrics th, .metrics td { padding: 0.4rem 0.8rem; text-align: right; border: 1px solid #333; }
    .metrics th { text-align: left; background: #16213e; }
    .metrics tr:nth-child(even) { background: #0f0f23; }
    .summary { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1rem 0; }
    .card { background: #16213e; padding: 1rem 1.5rem; border-radius: 8px; min-width: 140px; }
    .card .value { font-size: 1.8rem; font-weight: 700; color: #e94560; }
    .card .value.errors { color: #ff6b6b; }
    .card .label { font-size: 0.85rem; color: #888; }
    .errors { color: #ff6b6b; }
    .chart-container { max-width: 800px; height: 260px; margin: 1rem 0; }
    ul { margin: 0.3rem 0; padding-left: 1.2rem; }
    .meta { color: #666; font-size: 0.9rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Reporte de pruebas de estrés</h1>
  <p class="meta">Generado desde <code>${path.basename(inputPath)}</code> — Duración: ${durationSec.toFixed(1)} s</p>

  <div class="summary">
    <div class="card"><div class="value">${vusersCreated}</div><div class="label">Virtual users creados</div></div>
    <div class="card"><div class="value">${vusersCompleted}</div><div class="label">Completados</div></div>
    <div class="card"><div class="value errors">${vusersFailed}</div><div class="label">Fallidos</div></div>
    <div class="card"><div class="value">${requestsPerSec}</div><div class="label">Req/s (aprox.)</div></div>
  </div>

  <h2>Escenarios</h2>
  <table class="metrics">
    <tr><th>Escenario</th><th>VUs creados</th></tr>
    ${scenarioCounts.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.count}</td></tr>`).join('')}
  </table>

  ${errors.length ? `
  <h2>Errores</h2>
  <table class="metrics">
    <tr><th>Tipo</th><th>Cantidad</th></tr>
    ${errors.map((e) => `<tr><td>${escapeHtml(e.name)}</td><td class="errors">${e.count}</td></tr>`).join('')}
  </table>` : ''}
  ${latencyHtml}

  ${intermediate.length > 0 ? `
  <h2>VUs creados por período</h2>
  <div class="chart-container"><canvas id="chartCreated"></canvas></div>
  <h2>VUs fallidos por período</h2>
  <div class="chart-container"><canvas id="chartFailed"></canvas></div>
  ` : ''}

  <p class="meta">Generado por generate-report-html.js — No subir este reporte a Git (está en .gitignore).</p>

  ${intermediate.length > 0 ? `
  <script>
    const labels = ${JSON.stringify(labels)};
    new Chart(document.getElementById('chartCreated'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'VUs creados', data: ${JSON.stringify(createdData)}, borderColor: '#a2d2ff', tension: 0.3, fill: true }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
    new Chart(document.getElementById('chartFailed'), {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'VUs fallidos', data: ${JSON.stringify(failedData)}, borderColor: '#ff6b6b', tension: 0.3, fill: true }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  </script>` : ''}
</body>
</html>
`;

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log('Reporte HTML generado:', outputPath);
