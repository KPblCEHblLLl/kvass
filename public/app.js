// State
let khlebetsList = [];
let selectedIndex = null;

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
  detailLabel: document.getElementById('detail-label'),
  detailIterationBadge: document.getElementById('detail-iteration-badge'),
  closeDetailBtn: document.getElementById('close-detail-btn'),
  detailFlower: document.getElementById('detail-flower'),
  detailFlowerType: document.getElementById('detail-flower-type'),
  detailWater: document.getElementById('detail-water'),
  detailSugar: document.getElementById('detail-sugar'),
  detailOvenBake: document.getElementById('detail-oven-bake'),
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
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  newKhlebetsForm: document.getElementById('new-khlebets-form'),
  formIsSnack: document.getElementById('form-is-snack'),
  formSeedsRow: document.getElementById('form-seeds-row'),
  formIteration: document.getElementById('form-iteration'),
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

// Fetch list from backend API
async function loadKhlebets() {
  showLoading();
  try {
    const res = await fetch('/api/khlebets');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    khlebetsList = Array.isArray(data) ? data : [];
    
    // Sort by iteration ascending
    khlebetsList.sort((a, b) => (a.iteration || 0) - (b.iteration || 0));
    
    renderList();
    
    // Auto-select first item if available and none selected
    if (khlebetsList.length > 0) {
      if (selectedIndex === null || selectedIndex >= khlebetsList.length) {
        selectItem(0);
      } else {
        selectItem(selectedIndex);
      }
    } else {
      deselectItem();
    }
  } catch (err) {
    showError(err.message || 'Failed to load iterations');
  }
}

function renderList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = khlebetsList.filter((item, index) => {
    const label = formatKhlebetsLabel(item).toLowerCase();
    return label.includes(query) || String(item.iteration).includes(query);
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

    const subDiv = document.createElement('div');
    subDiv.className = 'khlebets-item-sub';
    subDiv.innerHTML = `
      <span>Oven: ${item.oven || 'Mine'} (${item.perBake || 1}/bake)</span>
      ${item.isSnack ? '<span class="snack-tag">★ Snack</span>' : ''}
    `;

    btn.appendChild(labelSpan);
    btn.appendChild(subDiv);

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
        return formatKhlebetsLabel(it).toLowerCase().includes(q);
      })[i]
    );
    btn.classList.toggle('active', filteredItemIndex === selectedIndex);
  });

  // Render detail view
  elements.detailPlaceholder.classList.add('hidden');
  elements.detailContent.classList.remove('hidden');

  elements.detailIterationBadge.textContent = `Iteration #${item.iteration}`;
  elements.detailLabel.textContent = formatKhlebetsLabel(item);

  elements.detailFlower.textContent = `${item.flower} g`;
  elements.detailFlowerType.textContent = item.flowerType;
  elements.detailWater.textContent = `${item.water} g (${Math.round((item.water / item.flower) * 100)}%)`;
  elements.detailSugar.textContent = item.sugar ? `${item.sugar} g` : '0 g';
  elements.detailOvenBake.textContent = `${item.oven || 'Mine'} • ${item.perBake || 1} pcs`;

  // Snack / Seeds
  elements.detailSnackStatus.innerHTML = item.isSnack
    ? '<span class="badge" style="background:#2d2618;color:#e09f3e;">✓ Snack Profile with Seeds</span>'
    : '<span class="badge" style="background:#1e2330;color:#9da7be;">Plain (No Seeds)</span>';

  elements.seedSesame.textContent = `${item.sesame || 0} g`;
  elements.seedSunflower.textContent = `${item.sunflower || 0} g`;
  elements.seedFlax.textContent = `${item.flax || 0} g`;

  // Baking Steps
  elements.bakingStepsBody.innerHTML = '';
  if (Array.isArray(item.baking) && item.baking.length > 0) {
    item.baking.forEach((step, stepIndex) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>Step ${stepIndex + 1}</td>
        <td>${step.temperature}°C</td>
        <td>${step.duration} min</td>
        <td>${step.fan ? '✓ Fan ON' : '✗ No Fan'}</td>
      `;
      elements.bakingStepsBody.appendChild(tr);
    });
  } else {
    elements.bakingStepsBody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted)">No baking steps recorded</td></tr>';
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
}

function showList() {
  elements.loadingState.classList.add('hidden');
  elements.emptyState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.khlebetsList.classList.remove('hidden');
}

// Modal Handlers
function openModal() {
  const nextIteration = khlebetsList.length > 0 
    ? Math.max(...khlebetsList.map(i => i.iteration || 0)) + 1 
    : 1;
  elements.formIteration.value = nextIteration;
  elements.modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  elements.modalBackdrop.classList.add('hidden');
  elements.newKhlebetsForm.reset();
}

// Event Listeners
elements.refreshBtn.addEventListener('click', loadKhlebets);
elements.retryBtn.addEventListener('click', loadKhlebets);
elements.searchInput.addEventListener('input', renderList);
elements.closeDetailBtn.addEventListener('click', deselectItem);

elements.newItemBtn.addEventListener('click', openModal);
elements.emptyCreateBtn.addEventListener('click', openModal);
elements.modalCloseBtn.addEventListener('click', closeModal);
elements.modalCancelBtn.addEventListener('click', closeModal);

elements.modalBackdrop.addEventListener('click', (e) => {
  if (e.target === elements.modalBackdrop) closeModal();
});

// Form Submit
elements.newKhlebetsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const iteration = parseInt(document.getElementById('form-iteration').value, 10);
  const oven = document.getElementById('form-oven').value;
  const perBake = parseInt(document.getElementById('form-per-bake').value, 10);
  const flower = parseInt(document.getElementById('form-flower').value, 10);
  const flowerType = document.getElementById('form-flower-type').value;
  const water = parseInt(document.getElementById('form-water').value, 10);
  const sugarVal = document.getElementById('form-sugar').value.trim();
  const sugar = sugarVal ? parseInt(sugarVal, 10) : undefined;
  
  const isSnack = elements.formIsSnack.checked;
  const sesame = parseInt(document.getElementById('form-sesame').value || '0', 10);
  const sunflower = parseInt(document.getElementById('form-sunflower').value || '0', 10);
  const flax = parseInt(document.getElementById('form-flax').value || '0', 10);

  const bakeTemp = parseInt(document.getElementById('form-bake-temp').value, 10);
  const bakeDur = parseInt(document.getElementById('form-bake-dur').value, 10);
  const bakeFan = document.getElementById('form-bake-fan').checked;

  const newItem = {
    iteration,
    oven,
    perBake,
    flower,
    flowerType,
    water,
    ...(sugar !== undefined ? { sugar } : {}),
    isSnack,
    ...(isSnack ? { sesame, sunflower, flax } : {}),
    baking: [
      {
        temperature: bakeTemp,
        duration: bakeDur,
        fan: bakeFan,
      }
    ]
  };

  try {
    const res = await fetch('/api/khlebets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });

    if (!res.ok) {
      throw new Error(`Failed to save: ${res.statusText}`);
    }

    closeModal();
    await loadKhlebets();
    // Select newly added item
    const newIdx = khlebetsList.findIndex(it => it.iteration === iteration);
    if (newIdx !== -1) selectItem(newIdx);
  } catch (err) {
    alert(`Error saving item: ${err.message}`);
  }
});

// Initial Load
document.addEventListener('DOMContentLoaded', loadKhlebets);
