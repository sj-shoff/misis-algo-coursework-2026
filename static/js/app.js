/**
 * Edmonds–Karp Visualizer — app.js
 *
 * Архитектура: MVC-like разделение.
 *   - GraphRenderer   — отрисовка графа в Cytoscape.js
 *   - AlgorithmRunner — взаимодействие с API
 *   - StepController  — управление пошаговым воспроизведением
 *   - UIController    — обновление DOM-элементов панели
 *   - App             — точка входа, связывает все части
 */

'use strict';

// ─── Константы ────────────────────────────────────────────────────────────────

const API_URL = '/api/solve';

const COLORS = {
  nodeDefault:  '#1e242c',
  nodeSource:   '#003d22',
  nodeSink:     '#3d0010',
  nodePath:     '#003847',
  edgeDefault:  '#2a3340',
  edgePath:     '#00d4ff',
  edgeSaturated:'#ffd166',
  textDefault:  '#6b7a8d',
  textPath:     '#e8edf2',
  sourceStroke: '#00e5a0',
  sinkStroke:   '#ff4d6a',
  pathStroke:   '#00d4ff',
};

const EXAMPLE_GRAPH = {
  source: 'S',
  sink:   'T',
  edges: [
    { from: 'S', to: 'A', capacity: 10 },
    { from: 'S', to: 'B', capacity: 10 },
    { from: 'A', to: 'B', capacity: 2  },
    { from: 'A', to: 'C', capacity: 4  },
    { from: 'A', to: 'D', capacity: 8  },
    { from: 'B', to: 'D', capacity: 9  },
    { from: 'C', to: 'T', capacity: 10 },
    { from: 'D', to: 'C', capacity: 6  },
    { from: 'D', to: 'T', capacity: 10 },
  ],
};

// ─── GraphRenderer ─────────────────────────────────────────────────────────────

/**
 * GraphRenderer управляет экземпляром Cytoscape и предоставляет
 * высокоуровневые методы отрисовки — остальной код не знает о Cytoscape.
 */
class GraphRenderer {
  /** @param {string} containerId */
  constructor(containerId) {
    this._source = null;
    this._sink   = null;
    this._cy     = cytoscape({
      container: document.getElementById(containerId),
      style:     this._buildStyles(),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });
  }

  /** Очищает граф и загружает новые данные. */
  load(graphData) {
    this._source = graphData.source;
    this._sink   = graphData.sink;
    this._cy.remove('*');

    const nodes = new Set();
    graphData.edges.forEach(e => { nodes.add(e.from); nodes.add(e.to); });

    nodes.forEach(id => {
      this._cy.add({
        data: { id, label: id, isSource: id === this._source, isSink: id === this._sink },
        classes: this._nodeClass(id),
      });
    });

    graphData.edges.forEach(e => {
      this._cy.add({
        data: {
          id:       `${e.from}__${e.to}`,
          source:   e.from,
          target:   e.to,
          label:    `0 / ${e.capacity}`,
          flow:     0,
          capacity: e.capacity,
        },
      });
    });

    this._layout();
  }

  /**
   * Обновляет граф по шагу алгоритма:
   * 1. Сбрасывает подсветку.
   * 2. Обновляет метки потока на всех рёбрах.
   * 3. Подсвечивает увеличивающий путь и вершины.
   */
  applyStep(step, source, sink) {
    // Сбросить всю подсветку
    this._cy.elements().removeClass('path-edge path-node saturated');

    // Обновляем метки потока
    step.edges.forEach(e => {
      const edge = this._cy.getElementById(`${e.from}__${e.to}`);
      if (!edge.length) return;
      edge.data('label', `${fmt(e.flow)} / ${fmt(e.capacity)}`);
      edge.data('flow', e.flow);
      edge.data('capacity', e.capacity);
      if (e.flow >= e.capacity) {
        edge.addClass('saturated');
      }
    });

    // Подсвечиваем путь
    for (let i = 0; i < step.path.length; i++) {
      const node = this._cy.getElementById(step.path[i]);
      node.addClass('path-node');
      if (i < step.path.length - 1) {
        const edge = this._cy.getElementById(`${step.path[i]}__${step.path[i + 1]}`);
        edge.addClass('path-edge');
      }
    }
  }

  /** Сбрасывает метки потока к нулю, убирает подсветку. */
  reset() {
    this._cy.elements().removeClass('path-edge path-node saturated');
    this._cy.edges().forEach(e => {
      const cap = e.data('capacity');
      e.data('label', `0 / ${fmt(cap)}`);
      e.data('flow', 0);
    });
  }

  _nodeClass(id) {
    if (id === this._source) return 'source-node';
    if (id === this._sink)   return 'sink-node';
    return '';
  }

  _layout() {
    const count = this._cy.nodes().length;
    const name  = count <= 6 ? 'circle' : 'cose';
    this._cy.layout({
      name,
      padding:   60,
      animate:   true,
      animationDuration: 500,
      nodeRepulsion: 6000,
      idealEdgeLength: 100,
    }).run();
  }

  _buildStyles() {
    return [
      {
        selector: 'node',
        style: {
          'width':              38,
          'height':             38,
          'label':              'data(label)',
          'text-valign':        'center',
          'text-halign':        'center',
          'font-family':        'JetBrains Mono, monospace',
          'font-size':          13,
          'font-weight':        700,
          'color':              COLORS.textDefault,
          'background-color':   COLORS.nodeDefault,
          'border-width':       2,
          'border-color':       '#2a3340',
        },
      },
      {
        selector: '.source-node',
        style: {
          'background-color':  COLORS.nodeSource,
          'border-color':      COLORS.sourceStroke,
          'color':             COLORS.sourceStroke,
          'border-width':      2.5,
        },
      },
      {
        selector: '.sink-node',
        style: {
          'background-color': COLORS.nodeSink,
          'border-color':     COLORS.sinkStroke,
          'color':            COLORS.sinkStroke,
          'border-width':     2.5,
        },
      },
      {
        selector: '.path-node',
        style: {
          'background-color':  COLORS.nodePath,
          'border-color':      COLORS.pathStroke,
          'color':             COLORS.textPath,
          'border-width':      2.5,
          // Cytoscape поддерживает box-shadow через overlay
          'overlay-color':     COLORS.pathStroke,
          'overlay-padding':   4,
          'overlay-opacity':   0.12,
        },
      },
      {
        selector: 'edge',
        style: {
          'label':                     'data(label)',
          'width':                     2,
          'line-color':                COLORS.edgeDefault,
          'target-arrow-color':        COLORS.edgeDefault,
          'target-arrow-shape':        'triangle',
          'arrow-scale':               1.2,
          'curve-style':               'bezier',
          'font-family':               'JetBrains Mono, monospace',
          'font-size':                 10,
          'color':                     '#6b7a8d',
          'text-background-color':     '#0a0c0f',
          'text-background-opacity':   0.9,
          'text-background-padding':   '3px',
          'text-border-width':         1,
          'text-border-color':         '#222830',
          'text-border-opacity':       1,
          'edge-text-rotation':        'autorotate',
        },
      },
      {
        selector: '.path-edge',
        style: {
          'line-color':           COLORS.edgePath,
          'target-arrow-color':   COLORS.edgePath,
          'width':                5,
          'color':                '#e8edf2',
          'text-background-color':'#003847',
          'overlay-color':        COLORS.edgePath,
          'overlay-padding':      3,
          'overlay-opacity':      0.1,
        },
      },
      {
        selector: '.saturated',
        style: {
          'line-color':         COLORS.edgeSaturated,
          'target-arrow-color': COLORS.edgeSaturated,
          'line-style':         'dashed',
          'line-dash-pattern':  [6, 3],
        },
      },
    ];
  }
}

// ─── AlgorithmRunner ───────────────────────────────────────────────────────────

/**
 * AlgorithmRunner отвечает только за HTTP-взаимодействие с API.
 * Не знает о DOM и Cytoscape.
 */
class AlgorithmRunner {
  /**
   * Отправляет граф на сервер и возвращает результат.
   * @returns {Promise<{maxFlow: number, steps: Array, minCutSrc: Array}>}
   */
  async solve(graphData) {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(graphData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'неизвестная ошибка' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

// ─── UIController ──────────────────────────────────────────────────────────────

/**
 * UIController управляет всеми DOM-обновлениями боковой панели.
 * Логика отображения изолирована от логики алгоритма.
 */
class UIController {
  constructor() {
    this._els = {
      statusDot:    document.getElementById('statusDot'),
      statusText:   document.getElementById('statusText'),
      graphTag:     document.getElementById('graphTag'),
      statFlow:     document.getElementById('statFlow'),
      statIter:     document.getElementById('statIter'),
      statDelta:    document.getElementById('statDelta'),
      statTotal:    document.getElementById('statTotal'),
      logBox:       document.getElementById('logBox'),
      pathDisplay:  document.getElementById('pathDisplay'),
      btnExample:   document.getElementById('btnExample'),
      btnRun:       document.getElementById('btnRun'),
      btnNext:      document.getElementById('btnNext'),
      btnReset:     document.getElementById('btnReset'),
      history:      document.getElementById('history'),
      histSection:  document.getElementById('historySection'),
    };
  }

  setStatus(type, text) {
    const dot = this._els.statusDot;
    dot.className = `status-dot ${type}`;
    this._els.statusText.textContent = text;
  }

  setGraphTag(text) {
    this._els.graphTag.textContent = text;
  }

  updateStats({ flow, iter, delta, total }) {
    if (flow  !== undefined) this._animateValue('statFlow',  flow  === null ? '—' : fmt(flow));
    if (iter  !== undefined) this._animateValue('statIter',  iter  === null ? '—' : iter);
    if (delta !== undefined) this._animateValue('statDelta', delta === null ? '—' : fmt(delta));
    if (total !== undefined) this._animateValue('statTotal', total === null ? '—' : total);
  }

  setLog(html) {
    this._els.logBox.innerHTML = html;
  }

  setPath(path, source, sink) {
    const el = this._els.pathDisplay;
    if (!path || path.length === 0) {
      el.innerHTML = '<span style="color:var(--text-dim);font-size:11px">нет данных</span>';
      return;
    }
    el.innerHTML = path.map((v, i) => {
      const cls = v === source ? 'source' : v === sink ? 'sink' : '';
      const node = `<span class="path-node ${cls}">${v}</span>`;
      return i < path.length - 1 ? node + '<span class="path-arrow">→</span>' : node;
    }).join('');
  }

  setBtns({ run, next, example, reset } = {}) {
    if (run     !== undefined) this._els.btnRun.disabled     = !run;
    if (next    !== undefined) this._els.btnNext.disabled    = !next;
    if (example !== undefined) this._els.btnExample.disabled = !example;
    if (reset   !== undefined) this._els.btnReset.disabled   = !reset;
  }

  addHistory(step) {
    this._els.histSection.style.display = '';
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.iter = step.iteration;
    item.innerHTML = `
      <span class="history-num">#${step.iteration}</span>
      <span class="history-text">${step.path.join(' → ')}  <span style="color:var(--gold)">+${fmt(step.bottleneck)}</span></span>`;
    this._els.history.appendChild(item);
    this._els.history.scrollTop = this._els.history.scrollHeight;
  }

  highlightHistory(iteration) {
    this._els.history.querySelectorAll('.history-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.iter) === iteration);
    });
  }

  clearHistory() {
    this._els.history.innerHTML = '';
    this._els.histSection.style.display = 'none';
  }

  reset() {
    this.setStatus('', 'Ожидание');
    this.setGraphTag('— граф не загружен —');
    this.updateStats({ flow: null, iter: null, delta: null, total: null });
    this.setLog('<span class="log-prefix">→ </span>Загрузите граф и запустите алгоритм.');
    this.setPath(null);
    this.clearHistory();
    this.setBtns({ run: true, next: false, example: true, reset: true });
  }

  _animateValue(id, value) {
    const el = document.getElementById(id);
    el.textContent = value;
    el.classList.remove('changed');
    // reflow trick для перезапуска анимации
    void el.offsetWidth;
    el.classList.add('changed');
  }
}

// ─── StepController ────────────────────────────────────────────────────────────

/**
 * StepController управляет пошаговым воспроизведением результата.
 * Хранит историю шагов и текущую позицию.
 */
class StepController {
  constructor(renderer, ui) {
    this._renderer = renderer;
    this._ui       = ui;
    this._steps    = [];
    this._current  = -1;
    this._source   = null;
    this._sink     = null;
    this._maxFlow  = 0;
  }

  load(result, graphData) {
    this._steps   = result.steps;
    this._current = -1;
    this._source  = graphData.source;
    this._sink    = graphData.sink;
    this._maxFlow = result.maxFlow;

    this._ui.updateStats({
      total: this._steps.length,
      flow:  result.maxFlow,
    });
    this._ui.setLog(
      `<span class="log-prefix">✓ </span>Алгоритм выполнен. ` +
      `Максимальный поток: <span class="log-delta">${fmt(result.maxFlow)}</span>. ` +
      `Найдено итераций: <b>${this._steps.length}</b>. Нажимайте «Следующий шаг».`
    );
    this._ui.setBtns({ next: this._steps.length > 0, run: false });
    this._ui.setStatus('done', 'Готово к воспроизведению');
  }

  /** Переходит к следующему шагу. Возвращает false, если шаги закончились. */
  next() {
    this._current++;
    if (this._current >= this._steps.length) {
      this._finish();
      return false;
    }
    const step = this._steps[this._current];
    this._renderer.applyStep(step, this._source, this._sink);
    this._ui.updateStats({ iter: step.iteration, delta: step.bottleneck });
    this._ui.setPath(step.path, this._source, this._sink);
    this._ui.setLog(this._formatStepLog(step));
    this._ui.addHistory(step);
    this._ui.highlightHistory(step.iteration);
    this._ui.setStatus('active', `Шаг ${step.iteration} / ${this._steps.length}`);

    if (this._current === this._steps.length - 1) {
      this._ui.setBtns({ next: false });
      this._finish();
    }
    return true;
  }

  reset() {
    this._steps   = [];
    this._current = -1;
    this._source  = null;
    this._sink    = null;
  }

  _finish() {
    this._ui.setBtns({ next: false, run: true });
    this._ui.setStatus('done', `Завершено · поток = ${fmt(this._maxFlow)}`);
    this._ui.setLog(
      `<span class="log-prefix" style="color:var(--green)">✓ </span>` +
      `Все увеличивающие пути исчерпаны. ` +
      `<span class="log-delta">Max Flow = ${fmt(this._maxFlow)}</span>`
    );
  }

  _formatStepLog(step) {
    return (
      `<span class="log-prefix">→ </span>` +
      `Итерация <b>${step.iteration}</b>: путь ` +
      `<span class="log-path">[${step.path.join(' → ')}]</span> · ` +
      `узкое место Δ = <span class="log-delta">${fmt(step.bottleneck)}</span>`
    );
  }
}

// ─── App ───────────────────────────────────────────────────────────────────────

/**
 * App — точка сборки. Связывает компоненты, регистрирует обработчики событий.
 */
class App {
  constructor() {
    this._renderer   = new GraphRenderer('cy');
    this._runner     = new AlgorithmRunner();
    this._ui         = new UIController();
    this._stepper    = new StepController(this._renderer, this._ui);
    this._graphData  = null;

    this._ui.reset();
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('btnExample').addEventListener('click', () => this._loadExample());
    document.getElementById('btnRun').addEventListener('click',     () => this._run());
    document.getElementById('btnNext').addEventListener('click',    () => this._next());
    document.getElementById('btnReset').addEventListener('click',   () => this._reset());

    // Клавиша → для удобства пошагового просмотра
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' && !document.getElementById('btnNext').disabled) {
        this._next();
      }
    });
  }

  _loadExample() {
    this._graphData = EXAMPLE_GRAPH;
    this._renderer.load(this._graphData);
    this._ui.setStatus('active', 'Граф загружен');
    this._ui.setGraphTag(`|V|=${countNodes(this._graphData)}  |E|=${this._graphData.edges.length}`);
    this._ui.setLog(
      '<span class="log-prefix">→ </span>Пример графа загружен. ' +
      'Нажмите «Запустить» для выполнения алгоритма.'
    );
    this._ui.updateStats({ flow: null, iter: null, delta: null, total: null });
    this._ui.clearHistory();
    this._ui.setBtns({ run: true, next: false, example: true, reset: true });
    this._stepper.reset();
  }

  async _run() {
    if (!this._graphData) {
      this._ui.setLog(
        '<span style="color:var(--red)">✗ </span>Сначала загрузите граф.'
      );
      return;
    }

    this._ui.setBtns({ run: false, next: false, example: false, reset: false });
    this._ui.setStatus('running', 'Вычисление...');
    this._ui.setLog('<span class="log-prefix">⟳ </span>Отправка запроса на сервер...');
    this._renderer.reset();
    this._ui.clearHistory();

    try {
      const result = await this._runner.solve(this._graphData);
      this._stepper.load(result, this._graphData);
      this._ui.setBtns({ reset: true, example: true });
    } catch (err) {
      this._ui.setStatus('', 'Ошибка');
      this._ui.setLog(
        `<span style="color:var(--red)">✗ </span>Ошибка: ${err.message}`
      );
      this._ui.setBtns({ run: true, next: false, example: true, reset: true });
    }
  }

  _next() {
    this._stepper.next();
  }

  _reset() {
    this._graphData = null;
    this._stepper.reset();
    this._renderer._cy.remove('*');
    this._ui.reset();
  }
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

/** Форматирует число: целые без дробной части, дробные до 1 знака. */
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Считает уникальные вершины в графе. */
function countNodes(graphData) {
  const s = new Set();
  graphData.edges.forEach(e => { s.add(e.from); s.add(e.to); });
  return s.size;
}

// ─── Инициализация ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  window.__app = new App();
});
