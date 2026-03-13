#!/usr/bin/env node
// jcodemunch Token Savings Tracker - Local Server
// Fetches live usage data from Anthropic Usage API and serves the dashboard
//
// Usage:
//   1. Set your Admin API key: set ANTHROPIC_ADMIN_KEY=sk-ant-admin-...
//   2. Run: node jcodemunch-server.js
//   3. Open: http://localhost:3333
//
// Get an Admin API key from: https://console.anthropic.com/settings/admin-keys

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.JCODEMUNCH_PORT || 3333;
const ADMIN_KEY = process.env.ANTHROPIC_ADMIN_KEY || '';
const API_BASE = 'api.anthropic.com';

function apiRequest(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_BASE,
      path: urlPath,
      method: 'GET',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': ADMIN_KEY,
        'Content-Type': 'application/json',
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
    req.end();
  });
}

async function fetchUsage(days = 30) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const params = new URLSearchParams({
    starting_at: start.toISOString(),
    ending_at: end.toISOString(),
    bucket_width: '1d',
    'group_by[]': 'model',
  });

  return apiRequest(`/v1/organizations/usage_report/messages?${params}`);
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
.status-dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
.status-dot.offline{background:var(--red)}
.status-dot.loading{background:var(--amber)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:13px;cursor:pointer;transition:all .15s}
.btn:hover{background:var(--border);border-color:#444}
.btn-primary{background:var(--green2);border-color:var(--green2);color:#fff;font-weight:600}
.btn-primary:hover{background:var(--green);border-color:var(--green)}
.btn-danger{background:transparent;border-color:var(--red);color:var(--red)}
.btn-danger:hover{background:var(--red);color:#fff}
.btn-live{background:var(--purple);border-color:var(--purple);color:#fff;font-weight:600}
.btn-live:hover{background:#9333ea;border-color:#9333ea}
.btn-live.active{box-shadow:0 0 12px rgba(168,85,247,.5)}
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
textarea.input{min-height:80px;resize:vertical;font-family:'Cascadia Code','Fira Code',monospace;font-size:12px}
.session-list{max-height:400px;overflow-y:auto}
.session-item{padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;transition:background .1s}
.session-item:hover{background:var(--card2)}
.session-item:last-child{border-bottom:none}
.session-info{flex:1}
.session-name{font-size:13px;font-weight:500;margin-bottom:2px}
.session-meta{font-size:11px;color:var(--muted)}
.session-savings{text-align:right}
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
.api-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase}
.api-badge.live{background:rgba(168,85,247,.2);color:var(--purple)}
.api-badge.manual{background:rgba(113,113,122,.2);color:var(--muted)}
.last-refresh{font-size:11px;color:var(--muted);margin-left:8px}
.auto-refresh-info{font-size:11px;color:var(--purple);margin-top:4px}
@media(max-width:768px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .panels{grid-template-columns:1fr}
  .controls{justify-content:center}
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
        <span id="status-text">Connecting...</span>
      </div>
      <button class="btn btn-live" id="btn-refresh" onclick="fetchLiveData()">Fetch Live Data</button>
      <button class="btn" id="btn-auto" onclick="toggleAutoRefresh()">Auto-Refresh: OFF</button>
      <button class="btn" onclick="openAddSession()">+ Manual Entry</button>
      <button class="btn" onclick="exportData()">Export</button>
      <button class="btn btn-danger" onclick="clearAllData()">Clear All</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Total Cache-Read Tokens</div>
      <div class="stat-value green" id="stat-saved">0</div>
      <div class="stat-sub" id="stat-saved-sub">tokens served from cache</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Input Tokens</div>
      <div class="stat-value blue" id="stat-total">0</div>
      <div class="stat-sub" id="stat-total-sub">uncached + output tokens</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Savings Rate</div>
      <div class="stat-value cyan" id="stat-rate">0%</div>
      <div class="stat-sub" id="stat-rate-sub">cache hit ratio</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Est. Cost Saved</div>
      <div class="stat-value amber" id="stat-cost">$0.00</div>
      <div class="stat-sub" id="stat-cost-sub">at current API rates</div>
    </div>
  </div>

  <div class="panels">
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Daily Savings</span>
        <span style="font-size:11px;color:var(--muted)" id="chart-range">Last 30 days</span>
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
          <label class="input-label">Model</label>
          <select class="input" id="setting-model" onchange="loadModelPricing()">
            <option value="opus">Claude Opus 4.6</option>
            <option value="sonnet">Claude Sonnet 4.6</option>
            <option value="haiku">Claude Haiku 4.5</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Input token price (per 1M tokens)</label>
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
        <div class="auto-refresh-info" id="refresh-info"></div>
      </div>
    </div>

    <div class="panel full-width">
      <div class="panel-header">
        <span class="panel-title">Usage by Day</span>
        <span style="font-size:11px;color:var(--muted)" id="session-count">0 days</span>
      </div>
      <div class="session-list" id="session-list">
        <div class="empty-state">
          <p>Click <strong>Fetch Live Data</strong> to pull usage from the Anthropic API, or use <strong>+ Manual Entry</strong>.</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Add Session Modal -->
<div class="modal-overlay" id="modal-add">
  <div class="modal">
    <h3>Manual Entry</h3>
    <div class="input-group">
      <label class="input-label">Label (optional)</label>
      <input class="input" id="add-name" placeholder="e.g. QAMFSHOP session">
    </div>
    <div class="input-group">
      <label class="input-label">Cache Read Tokens</label>
      <input class="input" type="number" id="add-cache-read" placeholder="e.g. 45230">
    </div>
    <div class="input-group">
      <label class="input-label">Cache Write Tokens</label>
      <input class="input" type="number" id="add-cache-write" placeholder="e.g. 12800">
    </div>
    <div class="input-group">
      <label class="input-label">Uncached Input Tokens</label>
      <input class="input" type="number" id="add-total" placeholder="e.g. 58030">
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
const STORAGE_KEY = 'jcodemunch_sessions';
const SETTINGS_KEY = 'jcodemunch_settings';
let autoRefreshInterval = null;

const MODEL_PRICING = {
  opus:   { input: 15.00, cacheRead: 1.50, cacheWrite: 18.75 },
  sonnet: { input: 3.00,  cacheRead: 0.30, cacheWrite: 3.75 },
  haiku:  { input: 0.80,  cacheRead: 0.08, cacheWrite: 1.00 },
};

function getSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveSessions(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}

function saveSettings() {
  const s = {
    model: document.getElementById('setting-model').value,
    inputPrice: parseFloat(document.getElementById('setting-input-price').value) || 15,
    cacheReadPrice: parseFloat(document.getElementById('setting-cache-price').value) || 1.5,
    cacheWritePrice: parseFloat(document.getElementById('setting-cache-write-price').value) || 18.75,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  renderAll();
}

function loadModelPricing() {
  const m = document.getElementById('setting-model').value;
  if (MODEL_PRICING[m]) {
    document.getElementById('setting-input-price').value = MODEL_PRICING[m].input;
    document.getElementById('setting-cache-price').value = MODEL_PRICING[m].cacheRead;
    document.getElementById('setting-cache-write-price').value = MODEL_PRICING[m].cacheWrite;
  }
}

function getPricing() {
  const s = getSettings();
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

function setStatus(state, text) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  dot.className = 'status-dot ' + state;
  txt.textContent = text;
}

async function fetchLiveData() {
  setStatus('loading', 'Fetching...');
  try {
    const res = await fetch('/api/usage');
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const data = await res.json();

    if (data.error) {
      setStatus('offline', 'API Error');
      alert('API Error: ' + data.error);
      return;
    }

    // Process usage buckets into daily sessions
    const buckets = data.data || [];
    if (buckets.length === 0) {
      setStatus('offline', 'No data returned');
      return;
    }

    // Merge all buckets by date
    const byDate = {};
    buckets.forEach(b => {
      const date = b.bucket_start_time.split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { cacheRead: 0, cacheWrite: 0, uncachedInput: 0, output: 0, model: b.model || 'unknown' };
      }
      byDate[date].cacheRead += b.cache_read_input_tokens || 0;
      byDate[date].cacheWrite += b.cache_creation_input_tokens || 0;
      byDate[date].uncachedInput += b.input_tokens || 0;
      byDate[date].output += b.output_tokens || 0;
    });

    // Convert to sessions array, replacing any existing API data
    const manualSessions = getSessions().filter(s => s.source === 'manual');
    const apiSessions = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        name: date + (d.model !== 'unknown' ? ' (' + d.model + ')' : ''),
        cacheRead: d.cacheRead,
        cacheWrite: d.cacheWrite,
        totalInput: d.uncachedInput,
        output: d.output,
        timestamp: date + 'T12:00:00Z',
        source: 'api',
      }));

    saveSessions([...apiSessions, ...manualSessions]);
    setStatus('', 'Live - ' + new Date().toLocaleTimeString());
    renderAll();
  } catch (e) {
    setStatus('offline', 'Error');
    alert('Failed to fetch: ' + e.message);
  }
}

function toggleAutoRefresh() {
  const btn = document.getElementById('btn-auto');
  const info = document.getElementById('refresh-info');
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    btn.textContent = 'Auto-Refresh: OFF';
    btn.classList.remove('btn-live');
    info.textContent = '';
  } else {
    fetchLiveData();
    autoRefreshInterval = setInterval(fetchLiveData, 60000);
    btn.textContent = 'Auto-Refresh: ON (1m)';
    btn.classList.add('btn-live');
    info.textContent = 'Auto-refreshing every 60 seconds';
  }
}

function renderAll() {
  const sessions = getSessions();
  renderStats(sessions);
  renderChart(sessions);
  renderSessionList(sessions);
  loadSettingsUI();
}

function renderStats(sessions) {
  let totalSaved = 0, totalTokens = 0, totalCostSaved = 0;
  sessions.forEach(s => {
    totalSaved += s.cacheRead || 0;
    totalTokens += (s.totalInput || 0) + (s.output || 0);
    totalCostSaved += calcCostSaved(s);
  });
  const rate = totalTokens > 0 ? ((totalSaved / (totalSaved + totalTokens)) * 100) : 0;

  document.getElementById('stat-saved').textContent = formatNum(totalSaved);
  document.getElementById('stat-saved-sub').textContent = 'across ' + sessions.length + ' day' + (sessions.length !== 1 ? 's' : '');
  document.getElementById('stat-total').textContent = formatNum(totalTokens);
  document.getElementById('stat-total-sub').textContent = 'uncached input + output';
  document.getElementById('stat-rate').textContent = rate.toFixed(1) + '%';
  document.getElementById('stat-cost').textContent = '$' + totalCostSaved.toFixed(2);

  const fill = document.getElementById('savings-fill');
  const pct = Math.min(rate, 100);
  fill.style.width = pct + '%';
  fill.textContent = pct.toFixed(0) + '%';
}

function renderChart(sessions) {
  const chart = document.getElementById('chart');
  const labels = document.getElementById('chart-labels');
  const recent = sessions.filter(s => s.source === 'api').slice(-30);
  document.getElementById('chart-range').textContent = 'Last ' + recent.length + ' day' + (recent.length !== 1 ? 's' : '');

  if (recent.length === 0) {
    chart.innerHTML = '<div class="empty-state" style="width:100%"><p>No API data yet</p></div>';
    labels.innerHTML = '';
    return;
  }

  const maxSaved = Math.max(...recent.map(s => s.cacheRead || 0), 1);
  chart.innerHTML = recent.map((s) => {
    const saved = s.cacheRead || 0;
    const h = Math.max((saved / maxSaved) * 180, 4);
    const cost = calcCostSaved(s);
    return '<div class="chart-bar" style="height:' + h + 'px"><div class="tooltip">' + (s.name||'') + '<br>' + formatNum(saved) + ' cached ($' + cost.toFixed(2) + ' saved)</div></div>';
  }).join('');

  labels.innerHTML = recent.map((s, i) => {
    if (recent.length <= 10 || i % Math.ceil(recent.length / 10) === 0) {
      return '<span>' + new Date(s.timestamp).toLocaleDateString('en', {month:'short',day:'numeric'}) + '</span>';
    }
    return '<span></span>';
  }).join('');
}

function renderSessionList(sessions) {
  const list = document.getElementById('session-list');
  document.getElementById('session-count').textContent = sessions.length + ' entr' + (sessions.length !== 1 ? 'ies' : 'y');

  if (sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>Click <strong>Fetch Live Data</strong> to pull usage from the Anthropic API.</p></div>';
    return;
  }

  list.innerHTML = [...sessions].reverse().map((s) => {
    const saved = s.cacheRead || 0;
    const cost = calcCostSaved(s);
    const total = (s.totalInput || 0) + (s.output || 0);
    const rate = (saved + total) > 0 ? ((saved / (saved + total)) * 100).toFixed(1) : '0.0';
    const badge = s.source === 'api' ? '<span class="api-badge live">API</span>' : '<span class="api-badge manual">Manual</span>';
    return '<div class="session-item"><div class="session-info"><div class="session-name">' + escapeHTML(s.name || 'Session') + ' ' + badge + '</div><div class="session-meta">' + formatNum(s.totalInput || 0) + ' input &middot; ' + formatNum(saved) + ' cache-read &middot; ' + formatNum(s.cacheWrite || 0) + ' cache-write &middot; ' + formatNum(s.output || 0) + ' output</div></div><div class="session-savings"><div class="session-savings-value">' + formatNum(saved) + ' saved ($' + cost.toFixed(2) + ')</div><div class="session-savings-pct">' + rate + '% cache hit</div></div></div>';
  }).join('');
}

function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

function loadSettingsUI() {
  const s = getSettings();
  if (s.model) document.getElementById('setting-model').value = s.model;
  if (s.inputPrice) document.getElementById('setting-input-price').value = s.inputPrice;
  if (s.cacheReadPrice) document.getElementById('setting-cache-price').value = s.cacheReadPrice;
  if (s.cacheWritePrice) document.getElementById('setting-cache-write-price').value = s.cacheWritePrice;
}

function openAddSession() { document.getElementById('modal-add').classList.add('active'); }
function closeModal() { document.getElementById('modal-add').classList.remove('active'); }

function addSession() {
  const name = document.getElementById('add-name').value.trim();
  const cacheRead = parseInt(document.getElementById('add-cache-read').value) || 0;
  const cacheWrite = parseInt(document.getElementById('add-cache-write').value) || 0;
  const totalInput = parseInt(document.getElementById('add-total').value) || 0;
  const output = parseInt(document.getElementById('add-output').value) || 0;
  if (cacheRead === 0 && totalInput === 0) { alert('Enter at least cache read or input tokens.'); return; }
  const sessions = getSessions();
  sessions.push({ name, cacheRead, cacheWrite, totalInput, output, timestamp: new Date().toISOString(), source: 'manual' });
  saveSessions(sessions);
  closeModal();
  renderAll();
}

function exportData() {
  const data = { sessions: getSessions(), settings: getSettings(), exported: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'jcodemunch-savings-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
}

function clearAllData() {
  if (!confirm('Clear ALL data?')) return;
  if (!confirm('Are you sure?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
}

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('active'); });
});

// Check API connectivity on load
async function checkAPI() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.hasKey) {
      setStatus('', 'Connected');
    } else {
      setStatus('offline', 'No API key configured');
    }
  } catch {
    setStatus('offline', 'Server not reachable');
  }
}

checkAPI();
renderAll();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hasKey: !!ADMIN_KEY, server: 'jcodemunch-tracker' }));
    return;
  }

  if (url.pathname === '/api/usage') {
    if (!ADMIN_KEY) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ANTHROPIC_ADMIN_KEY not set. Set it as an environment variable and restart.' }));
      return;
    }

    try {
      const days = parseInt(url.searchParams.get('days') || '30');
      const data = await fetchUsage(days);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
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
  console.log('  Dashboard: http://localhost:' + PORT);
  console.log('  API key:   ' + (ADMIN_KEY ? 'configured (' + ADMIN_KEY.slice(0, 16) + '...)' : 'NOT SET'));
  console.log('');
  if (!ADMIN_KEY) {
    console.log('  To enable live data, set your Admin API key:');
    console.log('');
    console.log('    Windows CMD:   set ANTHROPIC_ADMIN_KEY=sk-ant-admin-...');
    console.log('    PowerShell:    $env:ANTHROPIC_ADMIN_KEY="sk-ant-admin-..."');
    console.log('    Linux/Mac:     export ANTHROPIC_ADMIN_KEY=sk-ant-admin-...');
    console.log('');
    console.log('  Get an Admin key: https://console.anthropic.com/settings/admin-keys');
    console.log('');
  }
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
