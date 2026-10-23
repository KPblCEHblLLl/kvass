// State
let khlebetsList = [];
let selectedIndex = null;
let formBakingSteps = [];
let editingIteration = null;

// DOM Elements
const elements = {
  loadingState: document.getElementById('loading-state'),
  emptyState: document.getElementById('empty-state'),
  errorState: document.getElementById('error-state'),
  errorMessage: document.getElementById('error-message'),
  khlebetsList: document.getElementById('khlebets-list'),
  itemCount: document.getElementById('item-count'),
  searchInput: document.getElementById('search-input'),
  refreshBtn: document.getElementById('refresh-btn'),
  retryBtn: document.getElementById('error-retry-btn'),
  
  // Detail
  detailPlaceholder: document.getElementById('detail-placeholder'),
  detailContent: document.getElementById('detail-content'),
  detailTitle: document.getElementById('detail-title'),
  detailLabel: document.getElementById('detail-label'),
  editDetailBtn: document.getElementById('edit-detail-btn'),
  deleteDetailBtn: document.getElementById('delete-detail-btn'),
  closeDetailBtn: document.getElementById('close-detail-btn'),
  detailFlowerType: document.getElementById('detail-flower-type'),
  detailOven: document.getElementById('detail-oven'),
  detailPerBake: document.getElementById('detail-per-bake'),
  detailFlower: document.getElementById('detail-flower'),
  detailWater: document.getElementById('detail-water'),
  detailSugar: document.getElementById('detail-sugar'),
  seedsCard: document.getElementById('seeds-card'),
  detailSnackStatus: document.getElementById('detail-snack-status'),
  seedSesame: document.getElementById('seed-sesame'),
  seedSunflower: document.getElementById('seed-sunflower'),
  seedFlax: document.getElementById('seed-flax'),
  bakingStepsBody: document.getElementById('baking-steps-body'),
  rawJsonPreview: document.getElementById('raw-json-preview'),

  // Modal
  newItemBtn: document.getElementById('new-item-btn'),
  emptyCreateBtn: document.getElementById('empty-create-btn'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalTitle: document.getElementById('modal-title'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalSubmitBtn: document.getElementById('modal-submit-btn'),
  newKhlebetsForm: document.getElementById('new-khlebets-form'),
  formFlowerType: document.getElementById('form-flower-type'),
  formOven: document.getElementById('form-oven'),
  formPerBake: document.getElementById('form-per-bake'),
  formFlower: document.getElementById('form-flower'),
  formWater: document.getElementById('form-water'),
  formSugar: document.getElementById('form-sugar'),
  formIsSnack: document.getElementById('form-is-snack'),
  formSeedsRow: document.getElementById('form-seeds-row'),
  formSesame: document.getElementById('form-sesame'),
  formSunflower: document.getElementById('form-sunflower'),
  formFlax: document.getElementById('form-flax'),
  addStepBtn: document.getElementById('add-step-btn'),
  bakingStepsContainer: document.getElementById('baking-steps-container'),
};

/**
 * Label Formatter per specification:
 * # {$khlebets.iteration}: ${$khlebets.flowerType} — ${$khlebets.flower}:{$khlebets.water}:{$khlebets.sugar || '0'}${$khlebets.isSnack? ' plus seeds': '''}
 */
function formatKhlebetsLabel(khlebets) {
  const iteration = khlebets.iteration;
  const flowerType = khlebets.flowerType;
  const flower = khlebets.flower;
  const water = khlebets.water;
  const sugar = (khlebets.sugar !== undefined && khlebets.sugar !== null && khlebets.sugar !== '') ? khlebets.sugar : '0';
  const seeds = khlebets.isSnack ? ' plus seeds' : '';
  
  return `# ${iteration}: ${flowerType} — ${flower}:${water}:${sugar}${seeds}`;
}

function getNextIteration() {
  if (!khlebetsList || khlebetsList.length === 0) return 0;
  const max = khlebetsList.reduce((acc, it) => {
    const val = typeof it.iteration === 'number' ? it.iteration : -1;
    return val > acc ? val : acc;
  }, -1);
  return max + 1;
}

// Fetch list from backend API
async function loadKhlebets(options = {}) {
  const { showSpinner = true, selectIteration = null } = options;
  if (showSpinner) {
    showLoading();
  }
  try {
    const res = await fetch('/api/khlebets', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      let errorMsg = `Server returned HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMsg = errData.error;
      } catch {}
      throw new Error(errorMsg);
    }
    const data = await res.json();
    khlebetsList = Array.isArray(data) ? data : [];
    
    // Sort by iteration ascending
    khlebetsList.sort((a, b) => (Number(a.iteration) || 0) - (Number(b.iteration) || 0));
    
    renderList();

    if (selectIteration !== null && selectIteration !== undefined) {
      const idx = khlebetsList.findIndex(it => Number(it.iteration) === Number(selectIteration));
      if (idx !== -1) {
        selectItem(idx);
      } else {
        deselectItem();
      }
    } else if (showSpinner) {
      deselectItem();
    }
  } catch (err) {
    showError(err.message || 'Failed to load iterations');
  }
}

function renderList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = khlebetsList.filter((item) => {
    const label = formatKhlebetsLabel(item).toLowerCase();
    const itemTitle = `khlebets ${item.iteration}`.toLowerCase();
    return label.includes(query) || itemTitle.includes(query) || String(item.iteration).includes(query);
  });

  elements.itemCount.textContent = khlebetsList.length;

  if (khlebetsList.length === 0) {
    showEmpty();
    return;
  }

  showList();
  elements.khlebetsList.innerHTML = '';

  filtered.forEach((item) => {
    const originalIndex = khlebetsList.indexOf(item);
    const li = document.createElement('li');
    
    const btn = document.createElement('button');
    btn.className = `khlebets-item ${originalIndex === selectedIndex ? 'active' : ''}`;
    btn.type = 'button';
    btn.setAttribute('aria-label', formatKhlebetsLabel(item));
    
    const labelSpan = document.createElement('div');
    labelSpan.className = 'khlebets-item-label';
    labelSpan.textContent = formatKhlebetsLabel(item);

    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => {
      selectItem(originalIndex);
    });

    li.appendChild(btn);
    elements.khlebetsList.appendChild(li);
  });
}

function selectItem(index) {
  if (index < 0 || index >= khlebetsList.length) return;
  selectedIndex = index;
  const item = khlebetsList[index];

  // Update active state in list
  const buttons = elements.khlebetsList.querySelectorAll('.khlebets-item');
  buttons.forEach((btn, i) => {
    const filteredItemIndex = khlebetsList.indexOf(
      khlebetsList.filter(it => {
        const q = elements.searchInput.value.trim().toLowerCase();
        const label = formatKhlebetsLabel(it).toLowerCase();
        return label.includes(q) || String(it.iteration).includes(q);
      })[i]
    );
    btn.classList.toggle('active', filteredItemIndex === selectedIndex);
  });

  // Render detail view
  elements.detailPlaceholder.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');

  // Title: "Khlebets ${khlebets.iteration}"
  elements.detailTitle.textContent = `Khlebets ${item.iteration}`;
  elements.detailLabel.textContent = formatKhlebetsLabel(item);

  // First row: Flour Type, Oven, Quantity
  elements.detailFlowerType.textContent = item.flowerType || 'Rye2000';
  elements.detailOven.textContent = item.oven || 'Mine';
  elements.detailPerBake.textContent = item.perBake !== undefined ? item.perBake : 1;

  // Second row: Flour, Water, Sugar
  elements.detailFlower.textContent = `${item.flower} g`;
  elements.detailWater.textContent = `${item.water} g`;
  elements.detailSugar.textContent = (item.sugar !== undefined && item.sugar !== null && item.sugar !== '') ? `${item.sugar} g` : '0 g';

  // Snack / Seeds: hidden under Is Snack
  if (item.isSnack) {
    elements.seedsCard.classList.remove('hidden');
    elements.detailSnackStatus.innerHTML = '<span class="badge" style="background:#2d2618;color:#e09f3e;">✓ Snack Profile with Seeds</span>';
    elements.seedSesame.textContent = `${item.sesame || 0} g`;
    elements.seedSunflower.textContent = `${item.sunflower || 0} g`;
    elements.seedFlax.textContent = `${item.flax || 0} g`;
  } else {
    elements.seedsCard.classList.add('hidden');
  }

  // Baking Steps
  elements.bakingStepsBody.innerHTML = '';
  if (Array.isArray(item.baking) && item.baking.length > 0) {
    item.baking.forEach((step) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${step.temperature}°C</td>
        <td>${step.duration} min</td>
        <td>${step.fan ? '✓ Fan ON' : '✗ No Fan'}</td>
      `;
      elements.bakingStepsBody.appendChild(tr);
    });
  } else {
    elements.bakingStepsBody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted)">No baking steps recorded</td></tr>';
  }

  // Raw JSON
  elements.rawJsonPreview.textContent = JSON.stringify(item, null, 2);
}

function deselectItem() {
  selectedIndex = null;
  elements.detailPlaceholder.classList.remove('hidden');
  elements.detailContent.classList.add('hidden');
}

// UI State Switchers
function showLoading() {
  elements.loadingState.classList.remove('hidden');
  elements.emptyState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.khlebetsList.classList.add('hidden');
  elements.itemCount.textContent = '?';
  deselectItem();
}

function showEmpty() {
  elements.loadingState.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
  elements.errorState.classList.add('hidden');
  elements.khlebetsList.classList.add('hidden');
  deselectItem();
}

function showError(msg) {
  elements.loadingState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.errorState.classList.remove('hidden');
  elements.errorMessage.textContent = msg;
  elements.khlebetsList.classList.add('hidden');
  elements.itemCount.textContent = '?';
  deselectItem();
}

function showList() {
  elements.loadingState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.khlebetsList.classList.remove('hidden');
}

// Dynamic Baking Steps in Modal Form
function renderBakingStepsForm() {
  elements.bakingStepsContainer.innerHTML = '';
  formBakingSteps.forEach((step, index) => {
    const row = document.createElement('div');
    row.className = 'baking-step-row';
    row.dataset.stepIndex = index;

    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.min = '50';
    tempInput.max = '300';
    tempInput.required = true;
    tempInput.value = step.temperature ?? 200;
    tempInput.className = 'step-temp-input';
    tempInput.placeholder = 'Temp';
    tempInput.addEventListener('input', (e) => {
      formBakingSteps[index].temperature = parseInt(e.target.value, 10) || 0;
    });

    const durInput = document.createElement('input');
    durInput.type = 'number';
    durInput.min = '1';
    durInput.max = '180';
    durInput.required = true;
    durInput.value = step.duration ?? 25;
    durInput.className = 'step-dur-input';
    durInput.placeholder = 'Dur';
    durInput.addEventListener('input', (e) => {
      formBakingSteps[index].duration = parseInt(e.target.value, 10) || 0;
    });

    const fanContainer = document.createElement('div');
    fanContainer.className = 'step-fan-container';
    const fanCheckbox = document.createElement('input');
    fanCheckbox.type = 'checkbox';
    fanCheckbox.checked = Boolean(step.fan);
    fanCheckbox.className = 'step-fan-input';
    fanCheckbox.addEventListener('change', (e) => {
      formBakingSteps[index].fan = e.target.checked;
    });
    fanContainer.appendChild(fanCheckbox);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-step-btn';
    removeBtn.title = 'Remove step';
    removeBtn.innerHTML = '✕';
    removeBtn.disabled = formBakingSteps.length <= 1; // At least one step required
    removeBtn.addEventListener('click', () => {
      if (formBakingSteps.length > 1) {
        formBakingSteps.splice(index, 1);
        renderBakingStepsForm();
      }
    });

    row.appendChild(tempInput);
    row.appendChild(durInput);
    row.appendChild(fanContainer);
    row.appendChild(removeBtn);

    elements.bakingStepsContainer.appendChild(row);
  });
}

function addBakingStep() {
  const lastStep = formBakingSteps[formBakingSteps.length - 1];
  formBakingSteps.push({
    temperature: lastStep ? lastStep.temperature : 200,
    duration: lastStep ? lastStep.duration : 25,
    fan: false,
  });
  renderBakingStepsForm();
}

// Modal Handlers
function openCreateModal() {
  editingIteration = null;
  const nextIteration = getNextIteration();
  elements.modalTitle.textContent = `Khlebets ${nextIteration}`;
  elements.modalSubmitBtn.textContent = 'Save Iteration';
  
  // Reset form defaults
  elements.formFlowerType.value = 'Rye2000';
  elements.formOven.value = 'Mine';
  elements.formPerBake.value = '2';
  elements.formFlower.value = '300';
  elements.formWater.value = '250';
  elements.formSugar.value = '';
  
  elements.formIsSnack.checked = false;
  elements.formSeedsRow.classList.add('hidden');
  elements.formSesame.value = '0';
  elements.formSunflower.value = '0';
  elements.formFlax.value = '0';

  // Default at least 1 baking step
  formBakingSteps = [{ temperature: 200, duration: 25, fan: false }];
  renderBakingStepsForm();

  elements.modalBackdrop.classList.remove('hidden');
}

function openEditModal(item) {
  if (!item) return;
  editingIteration = item.iteration;
  elements.modalTitle.textContent = `Khlebets ${item.iteration}`;
  elements.modalSubmitBtn.textContent = 'Update Iteration';

  // Populate form with existing values
  elements.formFlowerType.value = item.flowerType || 'Rye2000';
  elements.formOven.value = item.oven || 'Mine';
  elements.formPerBake.value = String(item.perBake || 1);
  elements.formFlower.value = String(item.flower || 0);
  elements.formWater.value = String(item.water || 0);
  elements.formSugar.value = (item.sugar !== undefined && item.sugar !== null) ? String(item.sugar) : '';

  elements.formIsSnack.checked = Boolean(item.isSnack);
  if (elements.formIsSnack.checked) {
    elements.formSeedsRow.classList.remove('hidden');
  } else {
    elements.formSeedsRow.classList.add('hidden');
  }
  elements.formSesame.value = String(item.sesame || 0);
  elements.formSunflower.value = String(item.sunflower || 0);
  elements.formFlax.value = String(item.flax || 0);

  // Populate baking steps
  if (Array.isArray(item.baking) && item.baking.length > 0) {
    formBakingSteps = JSON.parse(JSON.stringify(item.baking));
  } else {
    formBakingSteps = [{ temperature: 200, duration: 25, fan: false }];
  }
  renderBakingStepsForm();

  elements.modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  elements.modalBackdrop.classList.add('hidden');
  elements.newKhlebetsForm.reset();
  editingIteration = null;
}

// Event Listeners
elements.refreshBtn.addEventListener('click', async () => {
  const originalContent = elements.refreshBtn.innerHTML;
  elements.refreshBtn.disabled = true;
  elements.refreshBtn.innerHTML = '<span class="btn-spinner"></span> Refreshing...';
  try {
    await loadKhlebets({ showSpinner: true });
  } finally {
    elements.refreshBtn.innerHTML = originalContent;
    elements.refreshBtn.disabled = false;
  }
});
elements.retryBtn.addEventListener('click', () => loadKhlebets({ showSpinner: true }));
elements.searchInput.addEventListener('input', renderList);
elements.closeDetailBtn.addEventListener('click', deselectItem);
elements.editDetailBtn.addEventListener('click', () => {
  if (selectedIndex !== null && khlebetsList[selectedIndex]) {
    openEditModal(khlebetsList[selectedIndex]);
  }
});
elements.deleteDetailBtn.addEventListener('click', async () => {
  if (selectedIndex === null || !khlebetsList[selectedIndex]) return;
  const item = khlebetsList[selectedIndex];
  const confirmDelete = window.confirm(`Delete Khlebets ${item.iteration}?`);
  if (!confirmDelete) return;

  const originalContent = elements.deleteDetailBtn.innerHTML;
  elements.deleteDetailBtn.disabled = true;
  elements.editDetailBtn.disabled = true;
  elements.deleteDetailBtn.innerHTML = '<span class="btn-spinner"></span> Deleting...';

  try {
    const res = await fetch(`/api/khlebets/${item.iteration}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      let errorMsg = `Failed to delete: HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMsg = errData.error;
      } catch {}
      throw new Error(errorMsg);
    }
    deselectItem();
    await loadKhlebets({ showSpinner: false });
  } catch (err) {
    alert(`Error deleting item: ${err.message}`);
  } finally {
    elements.deleteDetailBtn.innerHTML = originalContent;
    elements.deleteDetailBtn.disabled = false;
    elements.editDetailBtn.disabled = false;
  }
});

elements.newItemBtn.addEventListener('click', openCreateModal);
elements.emptyCreateBtn.addEventListener('click', openCreateModal);
elements.modalCloseBtn.addEventListener('click', closeModal);
elements.modalCancelBtn.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !elements.modalBackdrop.classList.contains('hidden')) {
    closeModal();
  }
});

// Is Snack toggle
elements.formIsSnack.addEventListener('change', () => {
  if (elements.formIsSnack.checked) {
    elements.formSeedsRow.classList.remove('hidden');
  } else {
    elements.formSeedsRow.classList.add('hidden');
  }
});

// Add step button
elements.addStepBtn.addEventListener('click', addBakingStep);

// Form Submit
elements.newKhlebetsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const isEdit = editingIteration !== null;
  const iteration = isEdit ? editingIteration : getNextIteration();
  const flowerType = elements.formFlowerType.value;
  const oven = elements.formOven.value;
  const perBake = parseInt(elements.formPerBake.value, 10);
  
  const flower = parseInt(elements.formFlower.value, 10);
  const water = parseInt(elements.formWater.value, 10);
  const sugarVal = elements.formSugar.value.trim();
  const sugar = sugarVal !== '' ? parseInt(sugarVal, 10) : undefined;
  
  const isSnack = elements.formIsSnack.checked;
  const sesame = parseInt(elements.formSesame.value || '0', 10);
  const sunflower = parseInt(elements.formSunflower.value || '0', 10);
  const flax = parseInt(elements.formFlax.value || '0', 10);

  // Validate at least one baking step
  if (!formBakingSteps || formBakingSteps.length === 0) {
    alert('At least one baking step is required.');
    return;
  }

  const baking = formBakingSteps.map((s) => ({
    temperature: typeof s.temperature === 'number' && !isNaN(s.temperature) ? s.temperature : 200,
    duration: typeof s.duration === 'number' && !isNaN(s.duration) ? s.duration : 25,
    fan: Boolean(s.fan),
  }));

  const itemPayload = {
    iteration,
    oven,
    perBake,
    flower,
    flowerType,
    water,
    ...(sugar !== undefined && !isNaN(sugar) ? { sugar } : {}),
    isSnack,
    ...(isSnack ? { sesame, sunflower, flax } : {}),
    baking,
  };

  const originalSubmitContent = elements.modalSubmitBtn.innerHTML;
  elements.modalSubmitBtn.disabled = true;
  elements.modalCancelBtn.disabled = true;
  elements.modalCloseBtn.disabled = true;
  const loadingLabel = isEdit ? 'Updating...' : 'Saving...';
  elements.modalSubmitBtn.innerHTML = `<span class="btn-spinner"></span> ${loadingLabel}`;

  try {
    const url = isEdit ? `/api/khlebets/${editingIteration}` : '/api/khlebets';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(itemPayload),
    });

    if (!res.ok) {
      let errorMsg = `Failed to save: HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMsg = errData.error;
      } catch {}
      throw new Error(errorMsg);
    }

    const saved = await res.json().catch(() => null);
    closeModal();
    
    // Select saved item by iteration without flashing full-page spinner
    const targetIteration = (saved && typeof saved.iteration === 'number') ? saved.iteration : iteration;
    await loadKhlebets({ showSpinner: false, selectIteration: targetIteration });
  } catch (err) {
    alert(`Error saving item: ${err.message}`);
  } finally {
    elements.modalSubmitBtn.innerHTML = originalSubmitContent;
    elements.modalSubmitBtn.disabled = false;
    elements.modalCancelBtn.disabled = false;
    elements.modalCloseBtn.disabled = false;
  }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => loadKhlebets({ showSpinner: true }));
