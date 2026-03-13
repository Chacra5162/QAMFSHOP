#!/usr/bin/env node
// jcodemunch Token Savings Tracker - API Proxy
// Sits between you and the Claude API, auto-tracking all token usage
//
// Usage:
//   1. Set your API key:
//      PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-api03-..."
//   2. Run:         node jcodemunch-server.js
//   3. Open:        http://localhost:3333
//
// PROXY MODE: Point your apps at http://localhost:3333 instead of
// https://api.anthropic.com and all usage is automatically tracked.
//
// Example with curl:
//   curl http://localhost:3333/v1/messages -H "x-api-key: your-key" ...
//
// Example with Anthropic SDK:
//   const client = new Anthropic({ baseURL: 'http://localhost:3333' });

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.JCODEMUNCH_PORT || 3333;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const API_HOST = 'api.anthropic.com';
const DATA_FILE = path.join(__dirname, 'jcodemunch-data.json');

// --- Data persistence ---
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { requests: [], totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0 }, settings: {} }; }
}
function saveDataFile(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let DATA = loadData();

function recordUsage(usage, model, endpoint) {
  const entry = {
    timestamp: new Date().toISOString(),
    model: model || 'unknown',
    endpoint: endpoint || '/v1/messages',
    input: usage.input_tokens || 0,
    output: usage.output_tokens || 0,
    cacheRead: usage.cache_read_input_tokens || 0,
    cacheWrite: usage.cache_creation_input_tokens || 0,
  };
  DATA.requests.push(entry);
  DATA.totals.input += entry.input;
  DATA.totals.output += entry.output;
  DATA.totals.cacheRead += entry.cacheRead;
  DATA.totals.cacheWrite += entry.cacheWrite;
  DATA.totals.requests += 1;
  saveDataFile(DATA);

  const saved = entry.cacheRead;
  const total = entry.input + entry.output;
  console.log(`  [${new Date().toLocaleTimeString()}] ${model} | in:${entry.input} out:${entry.output} cache-read:${saved} cache-write:${entry.cacheWrite} | total saved: ${DATA.totals.cacheRead.toLocaleString()}`);
}

// --- Proxy: forward request to Anthropic API ---
function proxyToAnthropic(req, bodyBuffer) {
  return new Promise((resolve, reject) => {
    const headers = { ...req.headers };
    // Use server's API key if client didn't provide one
    if (!headers['x-api-key'] && API_KEY) {
      headers['x-api-key'] = API_KEY;
    }
    // Ensure required headers
    if (!headers['anthropic-version']) {
      headers['anthropic-version'] = '2023-06-01';
    }
    delete headers['host'];
    delete headers['connection'];
    headers['content-length'] = bodyBuffer.length;

    const proxyReq = https.request({
      hostname: API_HOST,
      port: 443,
      path: req.url,
      method: req.method,
      headers: headers,
    }, (proxyRes) => {
      let data = [];
      proxyRes.on('data', chunk => data.push(chunk));
      proxyRes.on('end', () => {
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: Buffer.concat(data),
        });
      });
    });
    proxyReq.on('error', reject);
    if (bodyBuffer.length > 0) proxyReq.write(bodyBuffer);
    proxyReq.end();
  });
}

// --- Dashboard HTML ---
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>jcodemunch Token Savings Tracker</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0f1117;--card:#1a1d27;--card2:#222533;--border:#2a2d3a;
  --text:#e4e4e7;--muted:#71717a;--green:#22c55e;--green2:#16a34a;
  --red:#ef4444;--blue:#3b82f6;--purple:#a855f7;--amber:#f59e0b;
  --cyan:#06b6d4;
}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.app{max-width:1200px;margin:0 auto;padding:24px}
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:12px}
.logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--green),var(--cyan));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#000}
.logo h1{font-size:20px;font-weight:700;letter-spacing:-0.5px}
.logo span{color:var(--green)}
.status{display:flex;align-items:center;gap:8px;font-size:13px}
.status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:13px;cursor:pointer;transition:all .15s}
.btn:hover{background:var(--border);border-color:#444}
.btn-primary{background:var(--green2);border-color:var(--green2);color:#fff;font-weight:600}
.btn-primary:hover{background:var(--green);border-color:var(--green)}
.btn-danger{background:transparent;border-color:var(--red);color:var(--red)}
.btn-danger:hover{background:var(--red);color:#fff}
.proxy-banner{background:linear-gradient(135deg,#1e1b4b,#172554);border:1px solid #312e81;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
.proxy-banner .icon{font-size:24px;background:rgba(99,102,241,.2);padding:10px;border-radius:8px}
.proxy-banner .info{flex:1}
.proxy-banner .info h3{font-size:14px;color:#818cf8;margin-bottom:4px}
.proxy-banner .info p{font-size:12px;color:var(--muted);line-height:1.5}
.proxy-banner code{background:rgba(99,102,241,.15);color:#a5b4fc;padding:2px 8px;border-radius:4px;font-size:12px}
.proxy-banner .req-count{text-align:right;min-width:100px}
.proxy-banner .req-num{font-size:28px;font-weight:700;color:#818cf8}
.proxy-banner .req-label{font-size:11px;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.stat-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;letter-spacing:-1px}
.stat-sub{font-size:12px;color:var(--muted);margin-top:4px}
.stat-value.green{color:var(--green)}
.stat-value.blue{color:var(--blue)}
.stat-value.cyan{color:var(--cyan)}
.stat-value.amber{color:var(--amber)}
.panels{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.panel{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.panel-header{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.panel-title{font-size:14px;font-weight:600}
.panel-body{padding:20px}
.input-group{margin-bottom:16px}
.input-group:last-child{margin-bottom:0}
.input-label{display:block;font-size:12px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.input{width:100%;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;font-family:inherit}
.input:focus{outline:none;border-color:var(--green)}
.chart-area{height:200px;display:flex;align-items:flex-end;gap:2px;padding:20px;padding-top:0}
.chart-bar{flex:1;border-radius:3px 3px 0 0;min-height:2px;transition:height .3s;position:relative;cursor:pointer}
.chart-bar.cache{background:linear-gradient(to top,var(--green2),var(--cyan))}
.chart-bar.input{background:linear-gradient(to top,#1e3a5f,var(--blue))}
.chart-bar:hover{opacity:.8}
.chart-bar .tooltip{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;white-space:nowrap;margin-bottom:4px;z-index:10;line-height:1.5}
.chart-bar:hover .tooltip{display:block}
.chart-labels{display:flex;gap:2px;padding:0 20px;margin-bottom:4px}
.chart-labels span{flex:1;text-align:center;font-size:9px;color:var(--muted)}
.chart-legend{display:flex;gap:16px;padding:8px 20px 16px;font-size:11px;color:var(--muted)}
.chart-legend .dot{width:8px;height:8px;border-radius:2px;display:inline-block;margin-right:4px;vertical-align:middle}
.savings-meter{margin:0 20px 20px;background:var(--bg);border-radius:12px;overflow:hidden;height:28px;position:relative}
.savings-fill{height:100%;background:linear-gradient(90deg,var(--green2),var(--cyan));border-radius:12px;transition:width .5s;display:flex;align-items:center;justify-content:flex-end;padding-right:12px;font-size:11px;font-weight:700;min-width:50px}
.full-width{grid-column:1/-1}
.empty-state{text-align:center;padding:40px 20px;color:var(--muted)}
.empty-state p{margin-top:8px;font-size:13px}
.req-list{max-height:400px;overflow-y:auto}
.req-item{padding:10px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;transition:background .1s;font-size:12px}
.req-item:hover{background:var(--card2)}
.req-item:last-child{border-bottom:none}
.req-info{flex:1}
.req-model{font-weight:500;color:var(--text);margin-bottom:2px}
.req-meta{font-size:11px;color:var(--muted)}
.req-tokens{text-align:right;margin-left:16px}
.req-saved{font-weight:600;color:var(--green);font-size:13px}
.req-pct{font-size:10px;color:var(--muted)}
.live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1s infinite;margin-right:6px;vertical-align:middle}
@media(max-width:768px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .panels{grid-template-columns:1fr}
  .proxy-banner{flex-direction:column;text-align:center}
}
</style>
</head>
<body>
<div class="app">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">J</div>
      <h1><span>jcodemunch</span> Token Savings</h1>
    </div>
    <div class="controls">
      <div class="status">
        <div class="status-dot"></div>
        <span><span class="live-dot"></span>Live Proxy</span>
      </div>
      <button class="btn" onclick="exportData()">Export</button>
      <button class="btn btn-danger" onclick="clearAll()">Reset</button>
    </div>
  </div>

  <div class="proxy-banner">
    <div class="icon">&#x1f50c;</div>
    <div class="info">
      <h3>API Proxy Active</h3>
      <p>Point your apps at <code>http://localhost:${PORT}</code> instead of <code>https://api.anthropic.com</code><br>
      All API calls are forwarded to Anthropic and token usage is automatically tracked.</p>
    </div>
    <div class="req-count">
      <div class="req-num" id="total-requests">0</div>
      <div class="req-label">requests tracked</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Cache-Read (Saved)</div>
      <div class="stat-value green" id="stat-saved">0</div>
      <div class="stat-sub" id="stat-saved-sub">tokens from cache</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Input Tokens</div>
      <div class="stat-value blue" id="stat-input">0</div>
      <div class="stat-sub">uncached input</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Savings Rate</div>
      <div class="stat-value cyan" id="stat-rate">0%</div>
      <div class="stat-sub">cache hit ratio</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Est. Cost Saved</div>
      <div class="stat-value amber" id="stat-cost">$0.00</div>
      <div class="stat-sub" id="stat-cost-model">at Opus pricing</div>
    </div>
  </div>

  <div class="panels">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Token Flow (Last 50 requests)</span>
      </div>
      <div class="chart-area" id="chart"></div>
      <div class="chart-legend">
        <span><span class="dot" style="background:var(--cyan)"></span> Cache-read (saved)</span>
        <span><span class="dot" style="background:var(--blue)"></span> Uncached input</span>
      </div>
      <div class="savings-meter">
        <div class="savings-fill" id="savings-fill" style="width:0%">0%</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Pricing</span>
        <button class="btn" onclick="savePricing()" style="font-size:12px;padding:4px 12px">Save</button>
      </div>
      <div class="panel-body">
        <div class="input-group">
          <label class="input-label">Model Preset</label>
          <select class="input" id="pricing-model" onchange="loadPreset()">
            <option value="opus">Claude Opus 4.6 ($15 / $75)</option>
            <option value="sonnet">Claude Sonnet 4.6 ($3 / $15)</option>
            <option value="haiku">Claude Haiku 4.5 ($1 / $5)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Input price / 1M tokens</label>
          <input class="input" type="number" id="price-input" step="0.01" value="15">
        </div>
        <div class="input-group">
          <label class="input-label">Cache read price / 1M tokens</label>
          <input class="input" type="number" id="price-cache" step="0.01" value="1.50">
        </div>
      </div>
    </div>

    <div class="panel full-width">
      <div class="panel-header">
        <span class="panel-title"><span class="live-dot"></span>Live Request Feed</span>
        <span style="font-size:11px;color:var(--muted)" id="feed-count">0 requests</span>
      </div>
      <div class="req-list" id="req-list">
        <div class="empty-state">
          <p>Waiting for API calls... Point your app at <strong>http://localhost:${PORT}</strong></p>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
const PRESETS = {
  opus:   { input: 15, cache: 1.50 },
  sonnet: { input: 3,  cache: 0.30 },
  haiku:  { input: 1,  cache: 0.10 },
};

let pricing = { input: 15, cache: 1.50 };
let pollTimer = null;

function formatNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toLocaleString();
}

function escapeHTML(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function costSaved(cacheRead) {
  return (cacheRead / 1e6) * (pricing.input - pricing.cache);
}

function loadPreset() {
  const m = document.getElementById('pricing-model').value;
  if (PRESETS[m]) {
    document.getElementById('price-input').value = PRESETS[m].input;
    document.getElementById('price-cache').value = PRESETS[m].cache;
  }
}

function savePricing() {
  pricing.input = parseFloat(document.getElementById('price-input').value) || 15;
  pricing.cache = parseFloat(document.getElementById('price-cache').value) || 1.5;
  localStorage.setItem('jcodemunch_pricing', JSON.stringify(pricing));
  render(lastData);
}

let lastData = null;

function render(data) {
  if (!data) return;
  lastData = data;
  const t = data.totals || {};
  const reqs = data.requests || [];

  document.getElementById('total-requests').textContent = (t.requests || 0).toLocaleString();
  document.getElementById('stat-saved').textContent = formatNum(t.cacheRead || 0);
  document.getElementById('stat-saved-sub').textContent = formatNum(t.cacheWrite || 0) + ' cache-write';
  document.getElementById('stat-input').textContent = formatNum((t.input || 0) + (t.output || 0));

  const total = (t.input||0) + (t.output||0) + (t.cacheRead||0);
  const rate = total > 0 ? ((t.cacheRead||0) / total * 100) : 0;
  document.getElementById('stat-rate').textContent = rate.toFixed(1) + '%';
  document.getElementById('stat-cost').textContent = '$' + costSaved(t.cacheRead||0).toFixed(2);

  const fill = document.getElementById('savings-fill');
  fill.style.width = Math.min(rate, 100) + '%';
  fill.textContent = rate.toFixed(0) + '%';

  // Chart - last 50 requests, stacked bars
  const chart = document.getElementById('chart');
  const recent = reqs.slice(-50);
  if (recent.length === 0) {
    chart.innerHTML = '<div class="empty-state" style="width:100%"><p>Waiting for requests...</p></div>';
  } else {
    const maxTokens = Math.max(...recent.map(r => (r.cacheRead||0) + (r.input||0)), 1);
    chart.innerHTML = recent.map(r => {
      const cr = r.cacheRead || 0;
      const inp = r.input || 0;
      const totalH = Math.max(((cr + inp) / maxTokens) * 180, 4);
      const cacheH = totalH > 0 ? (cr / (cr + inp || 1)) * totalH : 0;
      const inputH = totalH - cacheH;
      const time = new Date(r.timestamp).toLocaleTimeString();
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;position:relative;cursor:pointer" class="chart-col">'
        + '<div class="chart-bar input" style="height:'+inputH+'px;border-radius:3px 3px 0 0"><div class="tooltip">'+escapeHTML(r.model)+'<br>'+time+'<br>Input: '+formatNum(inp)+'<br>Cache-read: '+formatNum(cr)+'<br>Output: '+formatNum(r.output||0)+'</div></div>'
        + '<div class="chart-bar cache" style="height:'+cacheH+'px;border-radius:0"></div>'
        + '</div>';
    }).join('');
  }

  // Request feed
  const list = document.getElementById('req-list');
  document.getElementById('feed-count').textContent = reqs.length + ' request' + (reqs.length!==1?'s':'');
  if (reqs.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Waiting for API calls...</p></div>';
  } else {
    list.innerHTML = [...reqs].reverse().slice(0, 100).map(r => {
      const cr = r.cacheRead || 0;
      const inp = r.input || 0;
      const pct = (cr+inp) > 0 ? (cr/(cr+inp)*100).toFixed(0) : '0';
      const saved = costSaved(cr);
      return '<div class="req-item"><div class="req-info"><div class="req-model">'+escapeHTML(r.model||'unknown')+'</div><div class="req-meta">'+new Date(r.timestamp).toLocaleString()+' &middot; in:'+formatNum(inp)+' out:'+formatNum(r.output||0)+' cache-read:'+formatNum(cr)+' cache-write:'+formatNum(r.cacheWrite||0)+'</div></div><div class="req-tokens"><div class="req-saved">'+formatNum(cr)+' saved</div><div class="req-pct">'+pct+'% cache &middot; $'+saved.toFixed(3)+' saved</div></div></div>';
    }).join('');
  }
}

async function poll() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    render(data);
  } catch {}
}

async function exportData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jcodemunch-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
  } catch(e) { alert('Export failed: '+e.message); }
}

async function clearAll() {
  if (!confirm('Reset all tracking data?')) return;
  await fetch('/api/reset', { method: 'POST' });
  poll();
}

// Load saved pricing
try {
  const saved = JSON.parse(localStorage.getItem('jcodemunch_pricing'));
  if (saved) { pricing = saved; document.getElementById('price-input').value = saved.input; document.getElementById('price-cache').value = saved.cache; }
} catch {}

// Start polling
poll();
pollTimer = setInterval(poll, 2000);
</script>
</body>
</html>`;

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Dashboard
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(DASHBOARD_HTML);
    return;
  }

  // Internal API: get data
  if (url.pathname === '/api/data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(DATA));
    return;
  }

  // Internal API: reset
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    DATA = { requests: [], totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0 }, settings: {} };
    saveDataFile(DATA);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // --- PROXY: Forward everything else to Anthropic API ---
  let bodyChunks = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', async () => {
    const bodyBuffer = Buffer.concat(bodyChunks);

    try {
      const apiRes = await proxyToAnthropic(req, bodyBuffer);

      // Copy response headers (skip transfer-encoding as we send the full body)
      const respHeaders = { ...apiRes.headers };
      delete respHeaders['transfer-encoding'];
      respHeaders['access-control-allow-origin'] = '*';
      respHeaders['access-control-allow-headers'] = '*';
      respHeaders['access-control-allow-methods'] = '*';

      if (req.method === 'OPTIONS') {
        res.writeHead(204, respHeaders);
        res.end();
        return;
      }

      res.writeHead(apiRes.statusCode, respHeaders);
      res.end(apiRes.body);

      // Extract usage from response if it's a messages call
      if (req.url.includes('/messages') && apiRes.statusCode === 200) {
        try {
          const parsed = JSON.parse(apiRes.body.toString());
          if (parsed.usage) {
            recordUsage(parsed.usage, parsed.model, req.url);
          }
        } catch {}
      }
    } catch (e) {
      console.error('  Proxy error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  jcodemunch Token Savings Tracker - PROXY MODE');
  console.log('  =============================================');
  console.log('');
  console.log('  Dashboard:    http://localhost:' + PORT);
  console.log('  Proxy:        http://localhost:' + PORT + '/v1/messages');
  console.log('  Data file:    ' + DATA_FILE);
  console.log('  API key:      ' + (API_KEY ? 'configured' : 'NOT SET'));
  console.log('');
  console.log('  HOW TO USE:');
  console.log('  Point your Claude API calls at http://localhost:' + PORT);
  console.log('  instead of https://api.anthropic.com');
  console.log('');
  console.log('  Examples:');
  console.log('    Anthropic SDK:  new Anthropic({ baseURL: "http://localhost:' + PORT + '" })');
  console.log('    curl:           curl http://localhost:' + PORT + '/v1/messages ...');
  console.log('    Claude Code:    ANTHROPIC_BASE_URL=http://localhost:' + PORT + ' claude');
  console.log('');
  if (DATA.totals.requests > 0) {
    console.log('  Existing data: ' + DATA.totals.requests + ' requests, ' + DATA.totals.cacheRead.toLocaleString() + ' tokens saved');
    console.log('');
  }
  console.log('  Waiting for API calls...');
  console.log('');
});
