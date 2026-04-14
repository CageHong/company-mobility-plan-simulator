/**
 * RENDER LAYER — controls.js v1.3
 *
 * Changes vs v1.2:
 *   - Added PT subsidy % slider (ctrl-pt-subsidy)
 *   - Added Optimize button binding → fires 'controls:optimize' event
 *   - Disabled state logic unchanged
 */

function initControls() {
  function el(id) { return document.getElementById(id); }

  const sliders = [
    {
      input: 'ctrl-bike-dist', label: 'ctrl-bike-dist-val',
      format: v => `${Number(v).toLocaleString()} m`,
    },
    {
      input: 'ctrl-pt-time', label: 'ctrl-pt-time-val',
      format: v => { const s = Number(v); return s < 60 ? `${s}s` : `${Math.round(s/60)} min`; },
    },
    {
      input: 'ctrl-pt-subsidy', label: 'ctrl-pt-subsidy-val',
      format: v => `${v}%`,
    },
    {
      input: 'ctrl-remote',      label: 'ctrl-remote-val',      format: v => `${v}%`,
    },
    {
      input: 'ctrl-carpool',     label: 'ctrl-carpool-val',     format: v => `${v}%`,
    },
    {
      input: 'ctrl-remote-days', label: 'ctrl-remote-days-val',
      format: v => {
        const d = Number(v);
        if (d === 0) return 'Full on-site';
        if (d === 5) return 'Fully remote';
        return `${d} day${d > 1 ? 's' : ''} / week`;
      },
    },
  ];

  for (const s of sliders) {
    const input = el(s.input);
    if (!input) continue;
    input.addEventListener('input', e => {
      el(s.label).textContent = s.format(e.target.value);
      dispatch();
    });
  }

  // Mode buttons
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      el('ctrl-mode').value = btn.dataset.mode;
      const conflictRow = el('conflict-row');
      if (conflictRow) conflictRow.style.display = btn.dataset.mode === 'both' ? 'block' : 'none';
      updateDisabledStates(btn.dataset.mode);
      dispatch();
    });
  });

  el('ctrl-conflict') && el('ctrl-conflict').addEventListener('change', dispatch);

  // Optimize button
  const optimBtn = el('btn-optimize');
  if (optimBtn) {
    optimBtn.addEventListener('click', () => {
      optimBtn.classList.add('loading');
      optimBtn.textContent = 'Optimizing…';
      // Defer to next tick so UI updates before heavy computation
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('controls:optimize', { detail: getParams() }));
      }, 30);
    });
  }

  updateDisabledStates('bike');
}

function updateDisabledStates(mode) {
  function setDisabled(inputId, rowId, disabled) {
    const input = document.getElementById(inputId);
    const row   = document.getElementById(rowId);
    if (!input || !row) return;
    if (disabled) {
      input.setAttribute('data-disabled', '');
      row.classList.add('is-disabled');
    } else {
      input.removeAttribute('data-disabled');
      row.classList.remove('is-disabled');
    }
  }
  setDisabled('ctrl-bike-dist', 'row-bike-dist', mode === 'pt');
  setDisabled('ctrl-pt-time',   'row-pt-time',   mode === 'bike');
  setDisabled('ctrl-pt-subsidy','row-pt-subsidy', mode === 'bike');
}

// Called by app.js after optimizer runs to animate sliders to optimal values
function animateToOptimal(optResult) {
  const modeMap = { bike: 0, pt: 1, both: 2 };
  const btns = document.querySelectorAll('[data-mode]');

  // Switch mode button
  btns.forEach(b => b.classList.remove('active'));
  btns[modeMap[optResult.mode]].classList.add('active');
  document.getElementById('ctrl-mode').value = optResult.mode;

  const conflictRow = document.getElementById('conflict-row');
  if (conflictRow) conflictRow.style.display = optResult.mode === 'both' ? 'block' : 'none';
  updateDisabledStates(optResult.mode);

  // Animate sliders
  animateSlider('ctrl-bike-dist', 'ctrl-bike-dist-val', optResult.bikeMaxDist,
    v => `${Number(v).toLocaleString()} m`);
  animateSlider('ctrl-pt-time',   'ctrl-pt-time-val',   optResult.ptMaxTime,
    v => { const s = Number(v); return s < 60 ? `${s}s` : `${Math.round(s/60)} min`; });

  // Reset optimize button
  const optimBtn = document.getElementById('btn-optimize');
  if (optimBtn) {
    optimBtn.classList.remove('loading');
    optimBtn.textContent = 'Optimize ↗';
  }
}

function animateSlider(inputId, labelId, targetValue, formatFn) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!input || !label) return;

  const start    = Number(input.value);
  const end      = Number(targetValue);
  const duration = 600; // ms
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = Math.round(start + (end - start) * eased);
    input.value          = current;
    label.textContent    = formatFn(current);
    if (progress < 1) requestAnimationFrame(step);
    else dispatch(); // final dispatch after animation
  }

  requestAnimationFrame(step);
}

function getParams() {
  function v(id) { return document.getElementById(id); }
  return {
    mode:              v('ctrl-mode').value,
    bikeMaxDist:       Number(v('ctrl-bike-dist').value),
    ptMaxTime:         Number(v('ctrl-pt-time').value),
    conflictRule:      v('ctrl-conflict').value,
    ptSubsidyPct:      Number(v('ctrl-pt-subsidy').value),
    remoteDaysPerWeek: Number(v('ctrl-remote-days').value),
    remoteWorkPct:     Number(v('ctrl-remote').value),
    carpoolingPct:     Number(v('ctrl-carpool').value),
  };
}

function dispatch() {
  document.dispatchEvent(new CustomEvent('controls:change', { detail: getParams() }));
}
