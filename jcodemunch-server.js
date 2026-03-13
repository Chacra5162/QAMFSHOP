#!/usr/bin/env node
// jcodemunch Token Savings Tracker - Local Server
// Tracks token savings from Claude API calls in real-time
//
// Usage:
//   1. Set your API key:
//      PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-api03-..."
//      CMD:         set ANTHROPIC_API_KEY=sk-ant-api03-...
//   2. Run:         node jcodemunch-server.js
//   3. Open:        http://localhost:3333
//
// The tracker sends a tiny API call periodically to measure cache behavior,
// and you can also manually log session token counts.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.JCODEMUNCH_PORT || 3333;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const API_BASE = 'api.anthropic.com';
const DATA_FILE = path.join(__dirname, 'jcodemunch-data.json');

// Persistent data store (file-based so it survives restarts)
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { sessions: [], settings: {} }; }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Make a Claude API call and capture the usage response
function apiCall(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: API_BASE,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`API ${res.statusCode}: ${data}`));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Send a minimal ping to verify the key works and get model info
async function pingAPI() {
  const result = await apiCall({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  });
  return result;
}

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
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.logo{display:flex;align-items:center;gap:12px}
.logo-icon{width:40px;height:40px;background:linear-gradient(135deg,var(--green),var(--cyan));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#000}
.logo h1{font-size:20px;font-weight:700;letter-spacing:-0.5px}
.logo span{color:var(--green)}
.status{display:flex;align-items:center;gap:8px;font-size:13px}
.status-dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}
.status-dot.online{background:var(--green);animation:pulse 2s infinite}
.status-dot.offline{background:var(--red)}
.status-dot.loading{background:var(--amber);animation:pulse .5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:13px;cursor:pointer;transition:all .15s}
.btn:hover{background:var(--border);border-color:#444}
.btn-primary{background:var(--green2);border-color:var(--green2);color:#fff;font-weight:600}
.btn-primary:hover{background:var(--green);border-color:var(--green)}
.btn-danger{background:transparent;border-color:var(--red);color:var(--red)}
.btn-danger:hover{background:var(--red);color:#fff}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.stat-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stat-value{font-size:28px;font-weight:700;letter-spacing:-1px}
.stat-sub{font-size:12px;color:var(--muted);margin-top:4px}
.stat-value.green{color:var(--green)}
.stat-value.blue{color:var(--blue)}
.stat-value.purple{color:var(--purple)}
.stat-value.amber{color:var(--amber)}
.stat-value.cyan{color:var(--cyan)}
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
.session-list{max-height:500px;overflow-y:auto}
.session-item{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;transition:background .1s}
.session-item:hover{background:var(--card2)}
.session-item:last-child{border-bottom:none}
.session-info{flex:1}
.session-name{font-size:13px;font-weight:500;margin-bottom:2px}
.session-meta{font-size:11px;color:var(--muted)}
.session-savings{text-align:right;margin-left:16px}
.session-savings-value{font-size:14px;font-weight:600;color:var(--green)}
.session-savings-pct{font-size:11px;color:var(--muted)}
.chart-area{height:200px;display:flex;align-items:flex-end;gap:4px;padding:20px;padding-top:0}
.chart-bar{flex:1;background:linear-gradient(to top,var(--green2),var(--cyan));border-radius:4px 4px 0 0;min-height:4px;transition:height .3s;position:relative;cursor:pointer}
.chart-bar:hover{opacity:.8}
.chart-bar .tooltip{display:none;position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:#000;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;white-space:nowrap;margin-bottom:4px;z-index:10}
.chart-bar:hover .tooltip{display:block}
.chart-labels{display:flex;gap:4px;padding:0 20px;margin-bottom:12px}
.chart-labels span{flex:1;text-align:center;font-size:9px;color:var(--muted)}
.savings-meter{margin:20px;background:var(--bg);border-radius:12px;overflow:hidden;height:32px;position:relative}
.savings-fill{height:100%;background:linear-gradient(90deg,var(--green2),var(--cyan));border-radius:12px;transition:width .5s;display:flex;align-items:center;justify-content:flex-end;padding-right:12px;font-size:12px;font-weight:700;min-width:60px}
.full-width{grid-column:1/-1}
.empty-state{text-align:center;padding:40px 20px;color:var(--muted)}
.empty-state p{margin-top:8px;font-size:13px}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;align-items:center;justify-content:center}
.modal-overlay.active{display:flex}
.modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:480px}
.modal h3{margin-bottom:16px;font-size:16px}
.modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;margin-left:8px}
.badge.manual{background:rgba(113,113,122,.2);color:var(--muted)}
.badge.api{background:rgba(168,85,247,.2);color:var(--purple)}
.delete-btn{background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:4px 8px;margin-left:8px}
.delete-btn:hover{color:var(--red)}
.how-to{background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px;font-size:12px;color:var(--muted);line-height:1.6}
.how-to code{background:var(--bg);padding:2px 6px;border-radius:4px;color:var(--cyan);font-size:11px}
@media(max-width:768px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .panels{grid-template-columns:1fr}
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
        <div class="status-dot" id="status-dot"></div>
        <span id="status-text">Checking...</span>
      </div>
      <button class="btn btn-primary" onclick="openAddSession()">+ Log Session</button>
      <button class="btn" onclick="testPing()">Test API Key</button>
      <button class="btn" onclick="exportData()">Export</button>
      <button class="btn" onclick="doImport()">Import</button>
      <button class="btn btn-danger" onclick="clearAll()">Clear All</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Total Cache-Read Tokens</div>
      <div class="stat-value green" id="stat-saved">0</div>
      <div class="stat-sub" id="stat-saved-sub">tokens served from cache</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Tokens Used</div>
      <div class="stat-value blue" id="stat-total">0</div>
      <div class="stat-sub" id="stat-total-sub">input + output</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Savings Rate</div>
      <div class="stat-value cyan" id="stat-rate">0%</div>
      <div class="stat-sub">cache hit ratio</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Est. Cost Saved</div>
      <div class="stat-value amber" id="stat-cost">$0.00</div>
      <div class="stat-sub" id="stat-cost-sub">at current pricing</div>
    </div>
  </div>

  <div class="panels">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Savings Over Time</span>
        <span style="font-size:11px;color:var(--muted)" id="chart-range"></span>
      </div>
      <div class="chart-area" id="chart"></div>
      <div class="chart-labels" id="chart-labels"></div>
      <div class="savings-meter">
        <div class="savings-fill" id="savings-fill" style="width:0%">0%</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Pricing Config</span>
        <button class="btn" onclick="saveSettings()" style="font-size:12px;padding:4px 12px">Save</button>
      </div>
      <div class="panel-body">
        <div class="input-group">
          <label class="input-label">Model Preset</label>
          <select class="input" id="setting-model" onchange="loadModelPricing()">
            <option value="opus">Claude Opus 4.6 ($15 / $75)</option>
            <option value="sonnet">Claude Sonnet 4.6 ($3 / $15)</option>
            <option value="haiku">Claude Haiku 4.5 ($1 / $5)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Input price (per 1M tokens)</label>
          <input class="input" type="number" id="setting-input-price" step="0.01" value="15.00">
        </div>
        <div class="input-group">
          <label class="input-label">Cache read price (per 1M tokens)</label>
          <input class="input" type="number" id="setting-cache-price" step="0.01" value="1.50">
        </div>
        <div class="input-group">
          <label class="input-label">Cache write price (per 1M tokens)</label>
          <input class="input" type="number" id="setting-cache-write-price" step="0.01" value="18.75">
        </div>
        <div class="how-to">
          <strong>How to get token counts:</strong><br>
          In Claude Code desktop, look at the bottom of each conversation for usage stats.
          Or check <code>console.anthropic.com/usage</code> for your account usage.
          Log each session here to track savings over time.
        </div>
      </div>
    </div>

    <div class="panel full-width">
      <div class="panel-header">
        <span class="panel-title">Session Log</span>
        <span style="font-size:11px;color:var(--muted)" id="session-count">0 sessions</span>
      </div>
      <div class="session-list" id="session-list">
        <div class="empty-state">
          <p>No sessions logged yet. Click <strong>+ Log Session</strong> to record your token usage.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Add Session Modal -->
<div class="modal-overlay" id="modal-add">
  <div class="modal">
    <h3>Log Session</h3>
    <div class="input-group">
      <label class="input-label">Session Name</label>
      <input class="input" id="add-name" placeholder="e.g. QAMFSHOP feature work">
    </div>
    <div class="input-group">
      <label class="input-label">Cache Read Tokens (the savings!)</label>
      <input class="input" type="number" id="add-cache-read" placeholder="e.g. 45230">
    </div>
    <div class="input-group">
      <label class="input-label">Cache Write Tokens</label>
      <input class="input" type="number" id="add-cache-write" placeholder="e.g. 12800">
    </div>
    <div class="input-group">
      <label class="input-label">Input Tokens (uncached)</label>
      <input class="input" type="number" id="add-input" placeholder="e.g. 58030">
    </div>
    <div class="input-group">
      <label class="input-label">Output Tokens</label>
      <input class="input" type="number" id="add-output" placeholder="e.g. 5000">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="addSession()">Save</button>
    </div>
  </div>
</div>

<script>
const MODEL_PRICING = {
  opus:   { input: 15.00, cacheRead: 1.50, cacheWrite: 18.75 },
  sonnet: { input: 3.00,  cacheRead: 0.30, cacheWrite: 3.75 },
  haiku:  { input: 1.00,  cacheRead: 0.10, cacheWrite: 1.25 },
};

let allData = { sessions: [], settings: {} };

async function loadFromServer() {
  try {
    const res = await fetch('/api/data');
    allData = await res.json();
  } catch { allData = { sessions: [], settings: {} }; }
}

async function saveToServer() {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(allData),
  });
}

function getPricing() {
  const s = allData.settings || {};
  return { input: s.inputPrice || 15, cacheRead: s.cacheReadPrice || 1.5, cacheWrite: s.cacheWritePrice || 18.75 };
}

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function calcCostSaved(s) {
  const p = getPricing();
  const cr = s.cacheRead || 0;
  return ((cr / 1e6) * p.input) - ((cr / 1e6) * p.cacheRead);
}

function setStatus(cls, text) {
  document.getElementById('status-dot').className = 'status-dot ' + cls;
  document.getElementById('status-text').textContent = text;
}

function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function renderAll() {
  const sessions = allData.sessions || [];
  // Stats
  let totalSaved = 0, totalTokens = 0, totalCost = 0;
  sessions.forEach(s => {
    totalSaved += s.cacheRead || 0;
    totalTokens += (s.input || 0) + (s.output || 0);
    totalCost += calcCostSaved(s);
  });
  const rate = (totalSaved + totalTokens) > 0 ? (totalSaved / (totalSaved + totalTokens) * 100) : 0;
  document.getElementById('stat-saved').textContent = formatNum(totalSaved);
  document.getElementById('stat-saved-sub').textContent = 'across ' + sessions.length + ' session' + (sessions.length !== 1 ? 's' : '');
  document.getElementById('stat-total').textContent = formatNum(totalTokens);
  document.getElementById('stat-rate').textContent = rate.toFixed(1) + '%';
  document.getElementById('stat-cost').textContent = '$' + totalCost.toFixed(2);
  const fill = document.getElementById('savings-fill');
  fill.style.width = Math.min(rate, 100) + '%';
  fill.textContent = rate.toFixed(0) + '%';

  // Chart
  const chart = document.getElementById('chart');
  const labels = document.getElementById('chart-labels');
  const recent = sessions.slice(-30);
  document.getElementById('chart-range').textContent = 'Last ' + recent.length + ' session' + (recent.length !== 1 ? 's' : '');
  if (recent.length === 0) {
    chart.innerHTML = '<div class="empty-state" style="width:100%"><p>No data yet</p></div>';
    labels.innerHTML = '';
  } else {
    const max = Math.max(...recent.map(s => s.cacheRead || 0), 1);
    chart.innerHTML = recent.map(s => {
      const cr = s.cacheRead || 0;
      const h = Math.max((cr / max) * 180, 4);
      const cost = calcCostSaved(s);
      return '<div class="chart-bar" style="height:'+h+'px"><div class="tooltip">'+ escapeHTML(s.name||'Session') +'<br>'+formatNum(cr)+' cached ($'+cost.toFixed(2)+' saved)</div></div>';
    }).join('');
    labels.innerHTML = recent.map((s,i) => {
      if (recent.length <= 10 || i % Math.ceil(recent.length/10) === 0) {
        return '<span>'+new Date(s.timestamp).toLocaleDateString('en',{month:'short',day:'numeric'})+'</span>';
      }
      return '<span></span>';
    }).join('');
  }

  // Session list
  const list = document.getElementById('session-list');
  document.getElementById('session-count').textContent = sessions.length + ' session' + (sessions.length !== 1 ? 's' : '');
  if (sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No sessions logged yet. Click <strong>+ Log Session</strong> to start tracking.</p></div>';
  } else {
    list.innerHTML = [...sessions].reverse().map((s, ri) => {
      const idx = sessions.length - 1 - ri;
      const cr = s.cacheRead || 0;
      const cost = calcCostSaved(s);
      const tot = (s.input||0)+(s.output||0);
      const r = (cr+tot)>0 ? (cr/(cr+tot)*100).toFixed(1) : '0.0';
      return '<div class="session-item"><div class="session-info"><div class="session-name">'+escapeHTML(s.name||'Session')+'</div><div class="session-meta">'+new Date(s.timestamp).toLocaleString()+' &middot; '+formatNum(s.input||0)+' input &middot; '+formatNum(cr)+' cache-read &middot; '+formatNum(s.cacheWrite||0)+' cache-write &middot; '+formatNum(s.output||0)+' output</div></div><div class="session-savings"><div class="session-savings-value">'+formatNum(cr)+' saved ($'+cost.toFixed(2)+')</div><div class="session-savings-pct">'+r+'% cache hit</div></div><button class="delete-btn" onclick="deleteSession('+idx+')">&times;</button></div>';
    }).join('');
  }

  // Settings
  const st = allData.settings || {};
  if (st.model) document.getElementById('setting-model').value = st.model;
  if (st.inputPrice) document.getElementById('setting-input-price').value = st.inputPrice;
  if (st.cacheReadPrice) document.getElementById('setting-cache-price').value = st.cacheReadPrice;
  if (st.cacheWritePrice) document.getElementById('setting-cache-write-price').value = st.cacheWritePrice;
}

function loadModelPricing() {
  const m = document.getElementById('setting-model').value;
  if (MODEL_PRICING[m]) {
    document.getElementById('setting-input-price').value = MODEL_PRICING[m].input;
    document.getElementById('setting-cache-price').value = MODEL_PRICING[m].cacheRead;
    document.getElementById('setting-cache-write-price').value = MODEL_PRICING[m].cacheWrite;
  }
}

async function saveSettings() {
  allData.settings = {
    model: document.getElementById('setting-model').value,
    inputPrice: parseFloat(document.getElementById('setting-input-price').value) || 15,
    cacheReadPrice: parseFloat(document.getElementById('setting-cache-price').value) || 1.5,
    cacheWritePrice: parseFloat(document.getElementById('setting-cache-write-price').value) || 18.75,
  };
  await saveToServer();
  renderAll();
}

function openAddSession() {
  document.getElementById('modal-add').classList.add('active');
  ['add-name','add-cache-read','add-cache-write','add-input','add-output'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('add-name').focus();
}
function closeModal() { document.getElementById('modal-add').classList.remove('active'); }

async function addSession() {
  const name = document.getElementById('add-name').value.trim();
  const cacheRead = parseInt(document.getElementById('add-cache-read').value) || 0;
  const cacheWrite = parseInt(document.getElementById('add-cache-write').value) || 0;
  const input = parseInt(document.getElementById('add-input').value) || 0;
  const output = parseInt(document.getElementById('add-output').value) || 0;
  if (cacheRead === 0 && input === 0) { alert('Enter at least cache read or input tokens.'); return; }
  allData.sessions.push({ name: name || 'Session', cacheRead, cacheWrite, input, output, timestamp: new Date().toISOString() });
  await saveToServer();
  closeModal();
  renderAll();
}

async function deleteSession(idx) {
  if (!confirm('Delete this session?')) return;
  allData.sessions.splice(idx, 1);
  await saveToServer();
  renderAll();
}

async function testPing() {
  setStatus('loading', 'Testing API key...');
  try {
    const res = await fetch('/api/ping');
    const data = await res.json();
    if (data.ok) {
      setStatus('online', 'API key valid - ' + data.model);
      alert('API key works! Model: ' + data.model + '\\nUsage: ' + JSON.stringify(data.usage, null, 2));
    } else {
      setStatus('offline', 'API error');
      alert('Error: ' + data.error);
    }
  } catch (e) {
    setStatus('offline', 'Connection failed');
    alert('Failed: ' + e.message);
  }
}

async function exportData() {
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'jcodemunch-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function doImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.sessions) {
        allData.sessions = [...allData.sessions, ...data.sessions];
        if (data.settings) allData.settings = data.settings;
        await saveToServer();
        renderAll();
        alert('Imported ' + data.sessions.length + ' session(s).');
      } else { alert('Invalid file format.'); }
    } catch (err) { alert('Invalid JSON: ' + err.message); }
  };
  input.click();
}

async function clearAll() {
  if (!confirm('Clear ALL data? This cannot be undone.')) return;
  allData.sessions = [];
  await saveToServer();
  renderAll();
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('active'); });
});

// Init
(async () => {
  await loadFromServer();
  renderAll();
  // Check API status
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.hasKey) {
      setStatus('online', 'API key configured');
    } else {
      setStatus('offline', 'No API key - manual mode');
    }
  } catch {
    setStatus('offline', 'Server error');
  }
})();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers for local use
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: status check
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hasKey: !!API_KEY }));
    return;
  }

  // API: test ping
  if (url.pathname === '/api/ping') {
    if (!API_KEY) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY not set' }));
      return;
    }
    try {
      const result = await pingAPI();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, model: result.model, usage: result.usage }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // API: get/save data
  if (url.pathname === '/api/data' && req.method === 'GET') {
    const data = loadData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  if (url.pathname === '/api/data' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        saveData(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve dashboard
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(DASHBOARD_HTML);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  jcodemunch Token Savings Tracker');
  console.log('  ================================');
  console.log('');
  console.log('  Dashboard:  http://localhost:' + PORT);
  console.log('  Data file:  ' + DATA_FILE);
  console.log('  API key:    ' + (API_KEY ? 'configured' : 'NOT SET (manual mode)'));
  console.log('');
  if (!API_KEY) {
    console.log('  To connect your API key (optional):');
    console.log('');
    console.log('    PowerShell:  $env:ANTHROPIC_API_KEY="sk-ant-api03-..."');
    console.log('    Then run:    node jcodemunch-server.js');
    console.log('');
    console.log('  Without an API key, use manual entry to log sessions.');
    console.log('');
  }
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
