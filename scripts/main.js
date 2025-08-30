// --- Pantallas ---
const landing = document.getElementById('landing');
const plan = document.getElementById('plan');
const toread = document.getElementById('toread');

// --- Navegación ---
document.addEventListener('click', function(e) {
  // Navegación a módulos
  const card = e.target.closest('.workspace-card');
  if (card && card.dataset.open === 'plan') {
    openScreen('plan');
    return;
  }
  if (card && card.dataset.open === 'toread') {
    openScreen('toread');
    return;
  }
  // Volver a home
  if (e.target.id === 'backFromPlan' || e.target.id === 'backFromRead') {
    goHome();
    return;
  }
  // Abrir modal para añadir
  if (e.target && e.target.id === 'addPlanBtn') openModal({mode:'plan'});
  if (e.target && e.target.id === 'addReadBtn') openModal({mode:'read'});
  // Cerrar modal
  if (e.target.matches('[data-close]') || e.target.classList.contains('modal-backdrop')) {
    closeModal();
  }
});

// --- Mostrar pantallas ---
function openScreen(id) {
  landing.classList.remove('active');
  plan.classList.remove('active');
  toread.classList.remove('active');
  if (id === 'plan') {
    plan.classList.add('active');
    renderPlan();
  } else if (id === 'toread') {
    toread.classList.add('active');
    renderRead();
  }
}
function goHome() {
  plan.classList.remove('active');
  toread.classList.remove('active');
  landing.classList.add('active');
}

// --- Modal lógica ---
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modalForm');
const modalTitle = document.getElementById('modalTitle');
const modalSave = document.getElementById('modalSave');
let modalMode = null;

function openModal(opts) {
  modalMode = opts.mode;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  modalForm.innerHTML = '';
  if (modalMode === 'plan') {
    modalTitle.textContent = 'Nueva tarea';
    modalForm.innerHTML = `
      <input name="title" placeholder="Título de la tarea" required />
      <input name="date" type="date" placeholder="Fecha límite" />
    `;
  } else if (modalMode === 'read') {
    modalTitle.textContent = 'Nuevo libro/artículo';
    modalForm.innerHTML = `
      <input name="title" placeholder="Título" required />
      <select name="status">
        <option value="Para leer">Para leer</option>
        <option value="En curso">En curso</option>
        <option value="Leído">Leído</option>
      </select>
    `;
  }
}
function closeModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  modalForm.reset();
}
if (modalSave) {
  modalSave.onclick = function(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(modalForm));
    addRow(modalMode, data);
    closeModal();
  };
}

// --- LocalStorage helpers ---
const PLAN_KEY = 'notion_like_plan_v1';
const READ_KEY = 'notion_like_read_v1';

function getPlan() {
  return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]');
}
function setPlan(v) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(v));
}
function getRead() {
  return JSON.parse(localStorage.getItem(READ_KEY) || '[]');
}
function setRead(v) {
  localStorage.setItem(READ_KEY, JSON.stringify(v));
}
function escapeHtml(s) {
  return (s || '').replace(/[<>&"']/g, c => ({
    '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function renderStatusChip(status) {
  if (status === 'En curso') return `<span class="status-chip status-in-progress">En curso</span>`;
  if (status === 'Para leer') return `<span class="status-chip status-to-read">Para leer</span>`;
  if (status === 'Leído') return `<span class="status-chip status-done">Leído</span>`;
  return '';
}

// --- Render Plan ---
const planBody = document.getElementById('planBody');
const planProgress = document.getElementById('planProgress');
const planPercent = document.getElementById('planPercent');
let planOrder = 'default';

function renderPlan() {
  let rows = getPlan();
  if (planOrder === 'alpha') {
    rows = [...rows].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (planOrder === 'date') {
    rows = [...rows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }
  planBody.innerHTML = '';
  if (rows.length === 0) {
    planBody.innerHTML = `<tr class="empty-row"><td colspan="3">No hay tareas aún.</td></tr>`;
    updatePlanProgress();
    return;
  }
  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    let titleCell = `<span class="${r.done ? 'task-done' : ''}" style="position:relative;">${escapeHtml(r.title)}${r.done ? '<span class="strike-anim"></span>' : ''}</span>`;
    tr.innerHTML = `
      <td>${titleCell}</td>
      <td>${escapeHtml(r.date || '')}</td>
      <td style="text-align:center">
        <input type="checkbox" ${r.done ? 'checked' : ''} data-idx="${idx}">
        <button class="ghost small delete-btn" title="Eliminar">🗑️</button>
      </td>
    `;
    planBody.appendChild(tr);
    // Eliminar con animación
    tr.querySelector('.delete-btn').onclick = function () {
      tr.style.transition = 'transform 0.4s, opacity 0.4s';
      tr.style.transform = 'translateX(-80%)';
      tr.style.opacity = '0';
      setTimeout(() => {
        const arr = getPlan();
        arr.splice(idx, 1);
        setPlan(arr);
        renderPlan();
      }, 400);
    };
    // Checkbox
    tr.querySelector('input[type="checkbox"]').onchange = function (e) {
      const arr = getPlan();
      arr[idx].done = e.target.checked;
      setPlan(arr);
      renderPlan();
    };
  });
  updatePlanProgress();
}
function updatePlanProgress() {
  const rows = getPlan();
  const done = rows.filter(r => r.done).length;
  const percent = rows.length ? Math.round((done / rows.length) * 100) : 0;
  if (planProgress) planProgress.style.width = percent + '%';
  if (planPercent) planPercent.textContent = percent + '%';
}

// --- Render Read ---
const readBody = document.getElementById('readBody');
function renderRead() {
  const rows = getRead();
  readBody.innerHTML = '';
  if (rows.length === 0) {
    readBody.innerHTML = `<tr class="empty-row"><td colspan="3">No hay lecturas aún.</td></tr>`;
    return;
  }
  rows.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.title)}</td>
      <td>${renderStatusChip(r.status)}</td>
      <td style="text-align:center">
        <button class="ghost small delete-btn" title="Eliminar">🗑️</button>
      </td>
    `;
    readBody.appendChild(tr);
    tr.querySelector('.delete-btn').onclick = function () {
      tr.style.transition = 'transform 0.4s, opacity 0.4s';
      tr.style.transform = 'translateX(-80%)';
      tr.style.opacity = '0';
      setTimeout(() => {
        const arr = getRead();
        arr.splice(idx, 1);
        setRead(arr);
        renderRead();
      }, 400);
    };
  });
}

// --- Añadir fila ---
function addRow(mode, data) {
  if (mode === 'plan') {
    const arr = getPlan();
    arr.push({ title: data.title || '', date: data.date || '', done: false });
    setPlan(arr);
    renderPlan();
  } else {
    const arr = getRead();
    arr.push({ title: data.title || '', status: data.status || 'Para leer' });
    setRead(arr);
    renderRead();
  }
}

// --- Ordenar menú ---
const orderBtn = document.getElementById('orderBtn');
const orderMenu = document.getElementById('orderMenu');
if (orderBtn && orderMenu) {
  orderBtn.onclick = e => {
    orderMenu.style.display = orderMenu.style.display === 'block' ? 'none' : 'block';
    e.stopPropagation();
  };
  orderMenu.querySelectorAll('button[data-order]').forEach(btn => {
    btn.onclick = function() {
      planOrder = btn.getAttribute('data-order');
      orderMenu.style.display = 'none';
      renderPlan();
    };
  });
  document.body.onclick = () => { orderMenu.style.display = 'none'; };
}

// --- Exportar (imprimir/descargar PDF) ---
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.onclick = function() {
    window.print();
  };
}

// --- Day/Night mode ---
const toggleBtn = document.getElementById('toggleMode');
if (toggleBtn) {
  function setMode(night) {
    document.body.classList.toggle('night-mode', night);
    document.body.classList.toggle('day-mode', !night);
    toggleBtn.textContent = night ? '🌞' : '🌙';
    toggleBtn.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.3) rotate(-10deg)' },
      { transform: 'scale(1)' }
    ], { duration: 400 });
  }
  let night = false;
  toggleBtn.onclick = () => {
    night = !night;
    setMode(night);
  };
  setMode(false);
}

// --- Inicializa en landing ---
goHome();