
// ── STATE 
const state = {
  current:     '0',   // number being typed
  previous:    '',    // previous operand
  operator:    null,  // pending operator
  justEvaled:  false, // true right after = pressed
  expression:  '',    // shown in top display line
};

// ── DOM REFS 
const resultEl    = document.getElementById('result');
const expressionEl = document.getElementById('expression');

// ── UPDATE DISPLAY 
function updateDisplay(animate = false) {
  // Adjust font size for long numbers
  const len = state.current.length;
  resultEl.classList.remove('small', 'xsmall');
  if (len > 12) resultEl.classList.add('xsmall');
  else if (len > 9) resultEl.classList.add('small');

  resultEl.textContent = state.current;
  expressionEl.innerHTML = state.expression || '&nbsp;';

  if (animate) {
    resultEl.classList.remove('pop');
    void resultEl.offsetWidth; // reflow
    resultEl.classList.add('pop');
  }
}

// ── INPUT DIGIT 
function inputDigit(digit) {
  if (state.justEvaled) {
    // Start fresh after evaluation
    state.current   = digit === '.' ? '0.' : digit;
    state.justEvaled = false;
  } else {
    if (digit === '.') {
      if (state.current.includes('.')) return; // no double dots
      state.current += '.';
    } else {
      state.current = state.current === '0' ? digit : state.current + digit;
    }
  }
  updateDisplay();
}

// ── INPUT OPERATOR 
function inputOperator(op) {
  // If there's a pending operator and user types another, compute first
  if (state.operator && !state.justEvaled) {
    compute(false);
  }

  state.previous   = state.current;
  state.operator   = op;
  state.justEvaled = false;
  state.expression = `${formatNum(state.previous)} ${op}`;
  state.current    = '0';

  highlightOp(op);
  updateDisplay();
}

// ── COMPUTE 
function compute(final = true) {
  if (!state.operator || state.previous === '') return;

  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  let result;

  switch (state.operator) {
    case '+': result = a + b; break;
    case '−': result = a - b; break;
    case '×': result = a * b; break;
    case '÷':
      if (b === 0) { showError('Cannot ÷ 0'); return; }
      result = a / b;
      break;
    default: return;
  }

  // Build expression string
  if (final) {
    state.expression = `${formatNum(a)} ${state.operator} ${formatNum(b)} =`;
  }

  // Round floating-point quirks (e.g. 0.1+0.2)
  const rounded = parseFloat(result.toPrecision(12));
  state.current    = String(rounded);
  state.previous   = '';
  state.operator   = null;
  state.justEvaled = final;

  clearOpHighlight();
  updateDisplay(final);
}

// ── CLEAR 
function clearAll() {
  state.current    = '0';
  state.previous   = '';
  state.operator   = null;
  state.justEvaled = false;
  state.expression = '';
  clearOpHighlight();
  updateDisplay();
}

// ── BACKSPACE ─────────────────────────────────────────────────────────────────
function backspace() {
  if (state.justEvaled) { clearAll(); return; }
  if (state.current.length <= 1) {
    state.current = '0';
  } else {
    state.current = state.current.slice(0, -1);
  }
  updateDisplay();
}

// ── ERROR ─────────────────────────────────────────────────────────────────────
function showError(msg) {
  state.current = msg;
  state.expression = '';
  state.operator = null;
  state.previous = '';
  state.justEvaled = true;
  updateDisplay(true);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatNum(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return n;
  return num.toLocaleString('en', { maximumFractionDigits: 8 });
}

function highlightOp(op) {
  clearOpHighlight();
  document.querySelectorAll('.btn-op').forEach(btn => {
    if (btn.dataset.value === op) btn.classList.add('active-op');
  });
}

function clearOpHighlight() {
  document.querySelectorAll('.btn-op').forEach(btn => btn.classList.remove('active-op'));
}

function flashButton(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.remove('key-flash');
  void el.offsetWidth;
  el.classList.add('key-flash');
}

// ── BUTTON CLICK EVENTS ───────────────────────────────────────────────────────
document.querySelectorAll('.btn').forEach(btn => {
  // Ripple effect: track mouse position
  btn.addEventListener('mousedown', e => {
    const rect = btn.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%';
    const ry = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
    btn.style.setProperty('--rx', rx);
    btn.style.setProperty('--ry', ry);
  });

  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value  = btn.dataset.value;

    if (action === 'clear')     clearAll();
    else if (action === 'backspace') backspace();
    else if (action === 'equals')    compute(true);
    else if (value) {
      const ops = ['+', '−', '×', '÷'];
      if (ops.includes(value)) inputOperator(value);
      else                     inputDigit(value);
    }
  });
});

// ── KEYBOARD SUPPORT ──────────────────────────────────────────────────────────
const KEY_MAP = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '.': '.', ',': '.',
  '+': '+',
  '-': '−',
  '*': '×', 'x': '×', 'X': '×',
  '/': '÷',
  'Enter': 'equals', '=': 'equals',
  'Backspace': 'backspace', 'Delete': 'clear',
  'Escape': 'clear', 'c': 'clear', 'C': 'clear',
};

document.addEventListener('keydown', e => {
  const mapped = KEY_MAP[e.key];
  if (!mapped) return;
  e.preventDefault();

  const ops = ['+', '−', '×', '÷'];

  if (mapped === 'clear') {
    flashButton('[data-action="clear"]');
    clearAll();
  } else if (mapped === 'backspace') {
    flashButton('[data-action="backspace"]');
    backspace();
  } else if (mapped === 'equals') {
    flashButton('[data-action="equals"]');
    compute(true);
  } else if (ops.includes(mapped)) {
    flashButton(`[data-value="${mapped}"]`);
    inputOperator(mapped);
  } else {
    flashButton(`[data-value="${mapped}"]`);
    inputDigit(mapped);
  }
});

// ── INIT 
updateDisplay();