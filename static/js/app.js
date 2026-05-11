/**
 * Edmonds–Karp Visualizer · app.js
 */

'use strict';

const API_URL = '/api/solve';

const C = {
  nodeBg:      '#1e242c',
  nodeSrc:     '#003d22',
  nodeSnk:     '#3d0010',
  nodePath:    '#2d1b4e',
  edgeDef:     '#2a3340',
  edgePath:    '#b829dd',
  edgeSat:     '#00d4ff',
  srcStroke:   '#00e5a0',
  snkStroke:   '#ff4d6a',
  pathStroke:  '#b829dd',
  textDef:     '#6b7a8d',
};

function generateRandomGraph() {
  const numMid = 4 + Math.floor(Math.random() * 5);
  const nodes = ['S'];
  
  for (let i = 0; i < numMid; i++) {
    nodes.push(String.fromCharCode(65 + i));
  }
  nodes.push('T');

  const edges = [];
  const midNodes = nodes.slice(1, -1);

  const fromSCount = 2 + Math.floor(Math.random() * 3);
  const shuffledS = [...midNodes].sort(() => Math.random() - 0.5);
  for (let i = 0; i < fromSCount; i++) {
    const cap = 12 + Math.floor(Math.random() * 13);
    edges.push({ from: 'S', to: shuffledS[i], capacity: cap });
  }

  for (let i = 0; i < midNodes.length; i++) {
    for (let j = i + 1; j < midNodes.length; j++) {
      if (Math.random() < 0.45) {
        const cap = 7 + Math.floor(Math.random() * 11);
        edges.push({ from: midNodes[i], to: midNodes[j], capacity: cap });
      }
    }
  }

  const toTCount = 2 + Math.floor(Math.random() * 3);
  const shuffledT = [...midNodes].sort(() => Math.random() - 0.5);
  for (let i = 0; i < toTCount; i++) {
    const cap = 10 + Math.floor(Math.random() * 14);
    edges.push({ from: shuffledT[i], to: 'T', capacity: cap });
  }

  for (let i = 0; i < midNodes.length - 1; i++) {
    if (Math.random() < 0.5) {
      edges.push({ 
        from: midNodes[i], 
        to: midNodes[(i + 2) % midNodes.length], 
        capacity: 8 + Math.floor(Math.random() * 9) 
      });
    }
  }

  const seen = new Set();
  const uniqueEdges = edges.filter(e => {
    const key = `${e.from}→${e.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  uniqueEdges.sort(() => Math.random() - 0.5);

  return {
    source: 'S',
    sink: 'T',
    edges: uniqueEdges
  };
}

class GraphRenderer {
  constructor(containerId) {
    this._src = null;
    this._snk = null;
    this._cy  = cytoscape({
      container: document.getElementById(containerId),
      style: this._styles(),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });
  }

  load(graph) {
    this._src = graph.source;
    this._snk = graph.sink;
    this._cy.remove('*');

    const nodes = new Set();
    graph.edges.forEach(e => { 
      nodes.add(e.from); 
      nodes.add(e.to); 
    });

    nodes.forEach(id => this._cy.add({
      data: { id, label: id },
      classes: id === this._src ? 'src' : id === this._snk ? 'snk' : '',
    }));

    graph.edges.forEach(e => this._cy.add({
      data: { 
        id: `${e.from}__${e.to}`, 
        source: e.from, 
        target: e.to,
        label: `0 / ${e.capacity}`, 
        capacity: e.capacity, 
        flow: 0 
      },
    }));

    this._cy.layout({
      name: 'concentric',
      root: '#S',
      minNodeSpacing: 80,
      avoidOverlap: true,
      avoidOverlapPadding: 30,
      spacingFactor: 1.2,
      concentric: function(node) {
        if (node.id() === 'S') return 0;
        if (node.id() === 'T') return 3;
        return 1;
      },
      levelWidth: () => 120,
      padding: 100,
      animate: true,
      animationDuration: 800,
      fit: true
    }).run();
  }

  applyStep(step) {
    this._cy.elements().removeClass('path-e path-n saturated');

    step.edges.forEach(e => {
      const edge = this._cy.getElementById(`${e.from}__${e.to}`);
      if (!edge.length) return;
      edge.data('label', `${fmt(e.flow)} / ${fmt(e.capacity)}`);
      if (e.flow >= e.capacity) edge.addClass('saturated');
    });

    step.path.forEach((v, i) => {
      const node = this._cy.getElementById(v);
      if (v !== this._src && v !== this._snk) {
        node.addClass('path-n');
      }
      if (i < step.path.length - 1) {
        this._cy.getElementById(`${step.path[i]}__${step.path[i+1]}`).addClass('path-e');
      }
    });
  }

  reset() {
    this._cy.elements().removeClass('path-e path-n saturated');
    this._cy.edges().forEach(e => {
      const cap = e.data('capacity');
      e.data('label', `0 / ${fmt(cap)}`);
    });
  }

  clear() { 
    this._cy.remove('*'); 
  }

  _styles() {
    return [
      { selector: 'node', style: {
          width: 44, height: 44, label: 'data(label)',
          'text-valign': 'center', 'text-halign': 'center',
          'font-family': 'JetBrains Mono, monospace', 'font-size': 14, 'font-weight': 700,
          color: C.textDef, 'background-color': C.nodeBg,
          'border-width': 2.5, 'border-color': '#2a3340',
      }},
      { selector: '.src', style: {
          'background-color': C.nodeSrc, 'border-color': C.srcStroke,
          color: C.srcStroke, 'border-width': 3.5,
      }},
      { selector: '.snk', style: {
          'background-color': C.nodeSnk, 'border-color': C.snkStroke,
          color: C.snkStroke, 'border-width': 3.5,
      }},
      { selector: '.path-n', style: {
          'background-color': C.nodePath, 'border-color': C.pathStroke,
          color: '#e8edf2', 'border-width': 3.5,
      }},
      { selector: 'edge', style: {
          label: 'data(label)', width: 2.5,
          'line-color': C.edgeDef, 'target-arrow-color': C.edgeDef,
          'target-arrow-shape': 'triangle', 'arrow-scale': 1.3,
          'curve-style': 'bezier',
          'font-family': 'JetBrains Mono, monospace', 'font-size': 10.5,
          color: '#6b7a8d', 'text-background-color': '#0a0c0f',
          'text-background-opacity': 0.95, 'text-background-padding': '4px',
      }},
      { selector: '.path-e', style: {
          'line-color': '#b829dd', 'target-arrow-color': '#b829dd', 
          width: 5.5,
          'line-style': 'solid',
      }},
      { selector: '.saturated', style: {
          'line-color': '#00d4ff', 'target-arrow-color': '#00d4ff',
          width: 3,
          'line-style': 'dashed', 'line-dash-pattern': [6, 3],
      }},
      { selector: '.path-e.saturated', style: {
          'line-color': '#b829dd', 'target-arrow-color': '#b829dd',
          width: 5.5,
          'line-style': 'solid',
      }},
    ];
  }
}

class StepsTable {
  constructor(onStepSelect) {
    this._onSelect  = onStepSelect;
    this._steps     = [];
    this._active    = -1;
    this._tbody     = document.getElementById('stepsBody');
    this._section   = document.getElementById('tableSection');
    this._progress  = document.getElementById('tableProgress');
    this._btnPrev   = document.getElementById('tBtnPrev');
    this._btnNext   = document.getElementById('tBtnNext');

    this._btnPrev.addEventListener('click', () => this._navigate(-1));
    this._btnNext.addEventListener('click', () => this._navigate(+1));
  }

  render(steps, source, sink) {
    this._steps = steps;
    this._active = -1;

    if (!steps.length) {
      this._section.style.display = 'none';
      return;
    }
    this._section.style.display = 'flex';

    let cumFlow = 0;
    const rows = steps.map((step, idx) => {
      cumFlow += step.bottleneck;

      const edgeMap = Object.fromEntries(step.edges.map(e => [`${e.from}__${e.to}`, e]));
      const pills = [];
      for (let i = 0; i < step.path.length - 1; i++) {
        const key = `${step.path[i]}__${step.path[i+1]}`;
        const e = edgeMap[key];
        const sat = e && e.flow >= e.capacity;
        pills.push(`<span class="edge-pill${sat ? ' saturated' : ''}">${step.path[i]}→${step.path[i+1]}: <span class="flow-num">${e ? fmt(e.flow) : '?'}</span>/${e ? fmt(e.capacity) : '?'}</span>`);
      }

      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      tr.innerHTML = `
        <td class="col-num cell-num">${step.iteration}</td>
        <td class="col-path cell-path">${step.path.join(' → ')}</td>
        <td class="col-num cell-delta">+${fmt(step.bottleneck)}</td>
        <td class="col-num cell-total">${fmt(cumFlow)}</td>
        <td class="col-edges">${pills.join('')}</td>`;
      tr.addEventListener('click', () => this._select(idx));
      return tr;
    });

    this._tbody.innerHTML = '';
    rows.forEach(r => this._tbody.appendChild(r));
    this._updateProgress();
  }

  activate(idx) { this._select(idx); }
  deactivate() {
    this._tbody.querySelectorAll('tr.row-active').forEach(r => r.classList.remove('row-active'));
    this._active = -1;
    this._updateProgress();
  }

  reset() {
    this._steps = [];
    this._active = -1;
    this._tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Нет данных</td></tr>';
    this._section.style.display = 'none';
    this._updateProgress();
  }

  get activeIndex() { return this._active; }
  get length() { return this._steps.length; }

  _select(idx) {
    if (idx < 0 || idx >= this._steps.length) return;
    this._tbody.querySelectorAll('tr.row-active').forEach(r => r.classList.remove('row-active'));
    const row = this._tbody.querySelector(`tr[data-idx="${idx}"]`);
    if (row) {
      row.classList.add('row-active');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    this._active = idx;
    this._updateProgress();
    this._onSelect(idx);
  }

  _navigate(delta) {
    const next = this._active + delta;
    if (next >= 0 && next < this._steps.length) this._select(next);
  }

  _updateProgress() {
    const total = this._steps.length;
    const cur = this._active >= 0 ? this._active + 1 : '—';
    this._progress.textContent = `${cur} / ${total || '—'}`;
    this._btnPrev.disabled = this._active <= 0;
    this._btnNext.disabled = this._active < 0 || this._active >= this._steps.length - 1;
  }
}

class UIController {
  constructor() {
    this.el = {
      dot:      document.getElementById('statusDot'),
      txt:      document.getElementById('statusText'),
      graphTag: document.getElementById('graphTag'),
      flowTag:  document.getElementById('flowTag'),
      flow:     document.getElementById('statFlow'),
      iter:     document.getElementById('statIter'),
      delta:    document.getElementById('statDelta'),
      total:    document.getElementById('statTotal'),
      log:      document.getElementById('logBox'),
      path:     document.getElementById('pathDisplay'),
      btnRun:   document.getElementById('btnRun'),
      btnNext:  document.getElementById('btnNext'),
      btnEx:    document.getElementById('btnExample'),
      btnRst:   document.getElementById('btnReset'),
    };
  }

  setStatus(type, text) {
    this.el.dot.className = `status-dot ${type}`;
    this.el.txt.textContent = text;
  }

  setGraphTag(text) { this.el.graphTag.textContent = text; }

  setFlowTag(v) {
    if (v == null) { this.el.flowTag.style.display = 'none'; return; }
    this.el.flowTag.style.display = '';
    this.el.flowTag.textContent = `MAX FLOW = ${fmt(v)}`;
  }

  stat(id, val) {
    const el = this.el[id];
    el.textContent = val == null ? '—' : val;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  log(html) { this.el.log.innerHTML = html; }

  setPath(path, src, snk) {
    const el = this.el.path;
    if (!path?.length) {
      el.innerHTML = '<span class="path-empty">нет данных</span>'; return;
    }
    el.innerHTML = path.map((v, i) => {
      const cls = v === src ? 'src' : v === snk ? 'snk' : '';
      const node = `<span class="pnode ${cls}">${v}</span>`;
      return i < path.length - 1 ? node + '<span class="parr">→</span>' : node;
    }).join('');
  }

  btns({ run, next, ex, rst } = {}) {
    if (run  !== undefined) this.el.btnRun.disabled  = !run;
    if (next !== undefined) this.el.btnNext.disabled = !next;
    if (ex   !== undefined) this.el.btnEx.disabled   = !ex;
    if (rst  !== undefined) this.el.btnRst.disabled  = !rst;
  }

  reset() {
    this.setStatus('', 'Ожидание');
    this.setGraphTag('— граф не загружен —');
    this.setFlowTag(null);
    ['flow','iter','delta','total'].forEach(k => this.stat(k, null));
    this.log('<span class="log-arrow">→</span> Нажмите «Новый пример»');
    this.setPath(null);
    this.btns({ run: true, next: false, ex: true, rst: true });
  }
}

class App {
  constructor() {
    this._graph  = null;
    this._result = null;
    this._cursor = -1;

    this._ui       = new UIController();
    this._renderer = new GraphRenderer('cy');
    this._table    = new StepsTable(idx => this._jumpToStep(idx));

    this._ui.reset();
    this._bindKeys();
    this._bindBtns();
  }

  _bindBtns() {
    document.getElementById('btnExample').onclick = () => this._loadExample();
    document.getElementById('btnRun').onclick     = () => this._run();
    document.getElementById('btnNext').onclick    = () => this._nextStep();
    document.getElementById('btnReset').onclick   = () => this._reset();
  }

  _bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' && !document.getElementById('btnNext').disabled) this._nextStep();
      if (e.key === 'ArrowLeft') this._prevStep();
    });
  }

  _loadExample() {
    this._graph  = generateRandomGraph();
    this._result = null;
    this._cursor = -1;

    this._renderer.load(this._graph);
    this._table.reset();
    this._ui.reset();

    this._ui.setStatus('active', 'Граф загружен');
    const nodeCount = countNodes(this._graph);
    const edgeCount = this._graph.edges.length;
    this._ui.setGraphTag(`|V| = ${nodeCount}  |E| = ${edgeCount}`);

    this._ui.log('<span class="log-arrow">→</span> Новый граф готов.<br>Нажмите <b>Запустить</b>.');
    this._ui.btns({ run: true, next: false, ex: true, rst: true });
  }

  async _run() {
    if (!this._graph) {
      this._ui.log('<span style="color:var(--red)">✗</span> Граф не загружен.');
      return;
    }

    this._ui.btns({ run: false, next: false, ex: false, rst: false });
    this._ui.setStatus('running', 'Вычисление...');
    this._ui.log('<span class="log-arrow">⟳</span> Запрос к серверу...');

    this._renderer.reset();
    this._table.reset();
    this._cursor = -1;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._graph),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Ошибка сервера');

      this._result = await res.json();
      this._onResult();
    } catch (err) {
      this._ui.setStatus('', 'Ошибка');
      this._ui.log(`<span style="color:var(--red)">✗</span> ${err.message}`);
      this._ui.btns({ run: true, next: false, ex: true, rst: true });
    }
  }

  _onResult() {
    const { maxFlow, steps } = this._result;
    this._table.render(steps, this._graph.source, this._graph.sink);

    this._ui.stat('flow', maxFlow);
    this._ui.stat('total', steps.length);
    this._ui.stat('iter', null);
    this._ui.stat('delta', null);
    this._ui.setFlowTag(maxFlow);
    this._ui.setStatus('done', 'Готово');

    this._ui.log(`<span class="log-arrow" style="color:var(--green)">✓</span> Max Flow = <b style="color:var(--accent)">${fmt(maxFlow)}</b>. Итераций: <b>${steps.length}</b>.`);
    this._ui.btns({ run: false, next: steps.length > 0, ex: true, rst: true });
  }

  _jumpToStep(idx) {
    if (!this._result?.steps?.length) return;
    const steps = this._result.steps;
    if (idx < 0 || idx >= steps.length) return;

    this._cursor = idx;
    const step = steps[idx];

    this._renderer.applyStep(step);
    this._ui.stat('iter', step.iteration);
    this._ui.stat('delta', step.bottleneck);
    this._ui.setPath(step.path, this._graph.source, this._graph.sink);
    this._ui.log(`<span class="log-arrow">→</span> Итерация <b>${step.iteration}</b>: путь <span style="color:var(--green)">[${step.path.join(' → ')}]</span> · Δ = <span style="color:var(--gold)">${fmt(step.bottleneck)}</span>`);
    this._ui.setStatus('active', `Шаг ${step.iteration} / ${steps.length}`);

    if (this._table.activeIndex !== idx) this._table.activate(idx);
    this._ui.btns({ next: idx < steps.length - 1 });

    if (idx === steps.length - 1) {
      this._ui.setStatus('done', `Завершено · Max Flow = ${fmt(this._result.maxFlow)}`);
    }
  }

  _nextStep() {
    const next = this._cursor + 1;
    if (this._result?.steps && next < this._result.steps.length) this._jumpToStep(next);
  }

  _prevStep() {
    const prev = this._cursor - 1;
    if (prev >= 0) this._jumpToStep(prev);
  }

  _reset() {
    this._graph = null;
    this._result = null;
    this._cursor = -1;
    this._renderer.clear();
    this._table.reset();
    this._ui.reset();
  }
}

function fmt(n) {
  if (n == null) return '?';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function countNodes(graph) {
  const s = new Set();
  graph.edges.forEach(e => { s.add(e.from); s.add(e.to); });
  return s.size;
}

document.addEventListener('DOMContentLoaded', () => { 
  window.__app = new App(); 
});