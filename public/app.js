// Forensic Nutrition PWA - Frontend Logic

const API_BASE = '';

// Store entries for editing
let currentEntries = [];

// DOM Elements
const scanBtn = document.getElementById('scan-btn');
const fileInput = document.getElementById('file-input');
const mealList = document.getElementById('meal-list');
const totalLow = document.getElementById('total-low');
const totalHigh = document.getElementById('total-high');
const totalProtein = document.getElementById('total-protein');
const totalCarbs = document.getElementById('total-carbs');
const totalSugar = document.getElementById('total-sugar');
const totalFat = document.getElementById('total-fat');
const mealsCount = document.getElementById('meals-count');
const currentDate = document.getElementById('current-date');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  loadSummary();
});

function updateDate() {
  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  currentDate.textContent = now.toLocaleDateString('en-US', options);
}

// Scan button triggers file input
scanBtn.addEventListener('click', () => {
  fileInput.click();
});

// Handle file selection
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Show loading state
  scanBtn.disabled = true;
  scanBtn.textContent = 'ANALYZING...';
  showLoading();

  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed');
    }

    showToast('Meal analyzed successfully!');
    loadSummary();

  } catch (error) {
    console.error('Analysis error:', error);
    showToast(error.message, true);
    loadSummary();
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = 'SCAN MEAL';
    fileInput.value = '';
  }
});

// Load today's summary
async function loadSummary() {
  try {
    const response = await fetch(`${API_BASE}/summary`);
    const data = await response.json();

    // Store entries for editing
    currentEntries = data.entries;

    // Update totals
    totalLow.textContent = data.total_cal_low.toLocaleString();
    totalHigh.textContent = data.total_cal_high.toLocaleString();
    totalProtein.textContent = `${data.total_protein_g || 0}g`;
    totalCarbs.textContent = `${data.total_carbs_g || 0}g`;
    totalSugar.textContent = `${data.total_sugar_g || 0}g`;
    totalFat.textContent = `${data.total_fat_g || 0}g`;

    if (data.meals === 0) {
      mealsCount.textContent = 'No meals logged';
      mealList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📷</div>
          <p>Scan your first meal to get started</p>
        </div>
      `;
    } else {
      mealsCount.textContent = `${data.meals} meal${data.meals > 1 ? 's' : ''} logged`;
      renderMeals(data.entries);
    }

  } catch (error) {
    console.error('Failed to load summary:', error);
  }
}

// Render meal entries (already in reverse chronological order from API)
function renderMeals(entries) {
  mealList.innerHTML = entries.map(entry => {
    const time = new Date(entry.time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    const itemsHtml = entry.items.map((item, idx) => {
      const portion = item.volume_oz
        ? `${item.portion} (${item.volume_oz} fl oz)`
        : item.portion;

      return `
        <div class="item-row" data-meal-id="${entry.id}" data-item-idx="${idx}">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-portion">${portion}</div>
          </div>
          <div class="item-cals">${item.cal_low}–${item.cal_high}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="meal-entry" data-id="${entry.id}">
        <button class="delete-btn" data-meal-id="${entry.id}" title="Delete meal">×</button>
        <div class="meal-header">
          <div>
            <div class="meal-time">${time}</div>
            <span class="confidence-badge confidence-${entry.confidence}">${entry.confidence}</span>
          </div>
          <div class="meal-calories">
            <div class="meal-cal-value">${entry.cal_low}–${entry.cal_high}</div>
            <div class="meal-macros">
              <span>P:${entry.protein_g || 0}g</span>
              <span>C:${entry.carbs_g || 0}g</span>
              <span>F:${entry.fat_g || 0}g</span>
            </div>
          </div>
        </div>
        <div class="meal-items-list">
          ${itemsHtml}
        </div>
        <div class="edit-hint">Tap an item to edit</div>
      </div>
    `;
  }).join('');

  // Add click handlers for editing items
  document.querySelectorAll('.item-row').forEach(el => {
    el.addEventListener('click', handleItemClick);
  });

  // Add click handlers for delete buttons
  document.querySelectorAll('.delete-btn').forEach(el => {
    el.addEventListener('click', handleDeleteClick);
  });
}

// Handle clicking on an item to edit
function handleItemClick(e) {
  const row = e.currentTarget;

  // Don't do anything if already editing
  if (row.classList.contains('editing')) return;

  const mealId = row.dataset.mealId;
  const itemIdx = parseInt(row.dataset.itemIdx);

  // Find the item
  const entry = currentEntries.find(e => e.id == mealId);
  if (!entry) return;

  const item = entry.items[itemIdx];
  if (!item) return;

  // Replace with edit form
  row.classList.add('editing');
  row.innerHTML = `
    <div class="edit-form">
      <input type="text" class="edit-input" id="edit-name" value="${item.name}" placeholder="Food name (e.g., Pozole)">
      <input type="text" class="edit-input" id="edit-portion" value="${item.portion}" placeholder="Portion (e.g., 2 cups)">
      <div class="edit-actions">
        <button class="edit-btn cancel">Cancel</button>
        <button class="edit-btn save">Recalculate</button>
      </div>
    </div>
  `;

  // Focus the name input
  row.querySelector('#edit-name').focus();

  // Handle cancel
  row.querySelector('.cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    loadSummary(); // Reload to reset UI
  });

  // Handle save
  row.querySelector('.save').addEventListener('click', async (e) => {
    e.stopPropagation();
    const name = row.querySelector('#edit-name').value.trim();
    const portion = row.querySelector('#edit-portion').value.trim();

    if (!name || !portion) {
      showToast('Please enter both name and portion', true);
      return;
    }

    // Show loading state
    row.innerHTML = `
      <div class="loading" style="padding: 12px;">
        <div class="spinner" style="width: 24px; height: 24px; margin: 0 auto;"></div>
      </div>
    `;

    try {
      const response = await fetch(`${API_BASE}/meal/${mealId}/item/${itemIdx}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, portion })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Update failed');
      }

      showToast('Recalculated!');
      loadSummary();

    } catch (error) {
      console.error('Update error:', error);
      showToast(error.message, true);
      loadSummary();
    }
  });

  // Handle enter key
  row.querySelectorAll('.edit-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        row.querySelector('.save').click();
      } else if (e.key === 'Escape') {
        row.querySelector('.cancel').click();
      }
    });
  });
}

// Handle delete meal
async function handleDeleteClick(e) {
  e.stopPropagation();
  const mealId = e.currentTarget.dataset.mealId;

  try {
    const response = await fetch(`${API_BASE}/meal/${mealId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Delete failed');
    }

    showToast('Meal deleted');
    loadSummary();

  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message, true);
  }
}

// Show loading state
function showLoading() {
  mealList.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Analyzing your meal...</p>
    </div>
  `;
}

// Toast notification
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast${isError ? ' error' : ''} show`;

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Offline detection
const offlineIndicator = document.getElementById('offline-indicator');

function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineIndicator.classList.remove('show');
    scanBtn.disabled = false;
  } else {
    offlineIndicator.classList.add('show');
    scanBtn.disabled = true;
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Check initial status
updateOnlineStatus();
