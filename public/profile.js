// Profile and Summary functionality for FNA

let profileLoaded = false;
let summaryLoaded = false;

// Load profile on tab switch
function initProfileTab() {
  if (profileLoaded) return;
  loadProfile();
  profileLoaded = true;
}

// Load existing profile data
async function loadProfile() {
  try {
    const response = await fetch('/profile');
    const profile = await response.json();

    if (profile.name) document.getElementById('profile-name').value = profile.name;
    if (profile.age) document.getElementById('profile-age').value = profile.age;
    if (profile.gender) document.getElementById('profile-gender').value = profile.gender;
    if (profile.current_weight) document.getElementById('profile-current-weight').value = profile.current_weight;
    if (profile.target_weight) document.getElementById('profile-target-weight').value = profile.target_weight;
    if (profile.weight_unit) document.getElementById('profile-weight-unit').value = profile.weight_unit;
    if (profile.activity_level) document.getElementById('profile-activity').value = profile.activity_level;

    if (profile.glp1_usage) {
      document.getElementById('glp1-toggle').classList.add('active');
      document.getElementById('glp1-type-group').style.display = 'block';
      if (profile.glp1_type) document.getElementById('profile-glp1-type').value = profile.glp1_type;
    }

    if (profile.cal_target) document.getElementById('target-calories').value = profile.cal_target;
    if (profile.protein_target) document.getElementById('target-protein').value = profile.protein_target;
    if (profile.carbs_target) document.getElementById('target-carbs').value = profile.carbs_target;
    if (profile.fat_target) document.getElementById('target-fat').value = profile.fat_target;

  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}

// Toggle GLP-1 switch
function toggleGlp1() {
  const toggle = document.getElementById('glp1-toggle');
  const typeGroup = document.getElementById('glp1-type-group');

  toggle.classList.toggle('active');
  typeGroup.style.display = toggle.classList.contains('active') ? 'block' : 'none';
}

// Generate AI targets
async function generateTargets() {
  const btn = document.getElementById('generate-targets-btn');
  const reasoning = document.getElementById('ai-reasoning');

  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const profile = getProfileData();
    const response = await fetch('/profile/generate-targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    document.getElementById('target-calories').value = data.cal_target;
    document.getElementById('target-protein').value = data.protein_target;
    document.getElementById('target-carbs').value = data.carbs_target;
    document.getElementById('target-fat').value = data.fat_target;

    if (data.reasoning) {
      reasoning.textContent = data.reasoning;
      reasoning.style.display = 'block';
    }

    showToast('Targets generated!');

  } catch (error) {
    console.error('Failed to generate targets:', error);
    showToast('Failed to generate targets', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'AI Generate';
  }
}

// Get profile data from form
function getProfileData() {
  return {
    name: document.getElementById('profile-name').value,
    age: parseInt(document.getElementById('profile-age').value) || null,
    gender: document.getElementById('profile-gender').value,
    current_weight: parseFloat(document.getElementById('profile-current-weight').value) || null,
    target_weight: parseFloat(document.getElementById('profile-target-weight').value) || null,
    weight_unit: document.getElementById('profile-weight-unit').value,
    activity_level: document.getElementById('profile-activity').value,
    glp1_usage: document.getElementById('glp1-toggle').classList.contains('active'),
    glp1_type: document.getElementById('profile-glp1-type').value,
    cal_target: parseInt(document.getElementById('target-calories').value) || null,
    protein_target: parseInt(document.getElementById('target-protein').value) || null,
    carbs_target: parseInt(document.getElementById('target-carbs').value) || null,
    fat_target: parseInt(document.getElementById('target-fat').value) || null
  };
}

// Save profile
async function saveProfile() {
  const btn = document.querySelector('.save-profile-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const profile = getProfileData();
    const response = await fetch('/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    showToast('Profile saved!');

    // Reset summary so it reloads with new profile
    summaryLoaded = false;

  } catch (error) {
    console.error('Failed to save profile:', error);
    showToast('Failed to save profile', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Profile';
  }
}

// Load AI Summary
async function loadAISummary() {
  const container = document.getElementById('summary-content');

  container.innerHTML = `
    <div class="spinner"></div>
    <p>Generating AI summary...</p>
  `;

  try {
    const response = await fetch('/ai-summary');
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    container.innerHTML = `
      <!-- 24 Hour Summary -->
      <div class="summary-section">
        <div class="summary-period">Last 24 Hours</div>
        <div class="summary-headline">${data.summary_24h?.headline || 'No meals logged yet'}</div>

        <div class="summary-stats">
          <div class="summary-stat">
            <div class="summary-stat-value">${data.meals_24h || 0}</div>
            <div class="summary-stat-label">Meals</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value" style="color: #22c55e">${data.totals_24h?.cal_low || 0}</div>
            <div class="summary-stat-label">Cal Low</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value" style="color: #f59e0b">${data.totals_24h?.cal_high || 0}</div>
            <div class="summary-stat-label">Cal High</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value" style="color: #3b82f6">${data.totals_24h?.protein_g || 0}g</div>
            <div class="summary-stat-label">Protein</div>
          </div>
        </div>

        <div class="summary-content">
          ${data.summary_24h?.nutrition_quality ? `
            <div class="summary-item">
              <div class="summary-item-label">Nutrition Quality</div>
              <div class="summary-item-text">${data.summary_24h.nutrition_quality}</div>
            </div>
          ` : ''}
          ${data.summary_24h?.protein_status ? `
            <div class="summary-item">
              <div class="summary-item-label">Protein Status</div>
              <div class="summary-item-text">${data.summary_24h.protein_status}</div>
            </div>
          ` : ''}
          ${data.summary_24h?.portion_insight ? `
            <div class="summary-item">
              <div class="summary-item-label">Portion Insight</div>
              <div class="summary-item-text">${data.summary_24h.portion_insight}</div>
            </div>
          ` : ''}
          ${data.summary_24h?.suggestion ? `
            <div class="summary-item" style="background: var(--accent-dim);">
              <div class="summary-item-label" style="color: var(--accent);">Suggestion</div>
              <div class="summary-item-text">${data.summary_24h.suggestion}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 7 Day Summary -->
      <div class="summary-section" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border);">
        <div class="summary-period">Last 7 Days</div>
        <div class="summary-headline">${data.summary_7d?.headline || 'Keep logging to see trends'}</div>

        <div class="summary-stats">
          <div class="summary-stat">
            <div class="summary-stat-value">${data.meals_7d || 0}</div>
            <div class="summary-stat-label">Total Meals</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value">${Math.round((data.totals_7d?.cal_low || 0) / 7)}</div>
            <div class="summary-stat-label">Avg Cal/Day</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value" style="color: #3b82f6">${Math.round((data.totals_7d?.protein_g || 0) / 7)}g</div>
            <div class="summary-stat-label">Avg Protein</div>
          </div>
        </div>

        <div class="summary-content">
          ${data.summary_7d?.patterns ? `
            <div class="summary-item">
              <div class="summary-item-label">Patterns</div>
              <div class="summary-item-text">${data.summary_7d.patterns}</div>
            </div>
          ` : ''}
          ${data.summary_7d?.wins ? `
            <div class="summary-item" style="background: var(--accent-dim);">
              <div class="summary-item-label" style="color: var(--accent);">Wins</div>
              <div class="summary-item-text">${data.summary_7d.wins}</div>
            </div>
          ` : ''}
          ${data.summary_7d?.focus_area ? `
            <div class="summary-item">
              <div class="summary-item-label">Focus Area</div>
              <div class="summary-item-text">${data.summary_7d.focus_area}</div>
            </div>
          ` : ''}
          ${data.summary_7d?.encouragement ? `
            <div class="summary-item" style="background: linear-gradient(135deg, var(--accent-dim), #1a1a1a);">
              <div class="summary-item-text" style="font-weight: 500;">${data.summary_7d.encouragement}</div>
            </div>
          ` : ''}
        </div>
      </div>

      <button class="refresh-btn" onclick="loadAISummary()">Refresh Summary</button>
    `;

    summaryLoaded = true;

  } catch (error) {
    console.error('Failed to load summary:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Failed to generate summary</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${error.message}</p>
        <button class="refresh-btn" onclick="loadAISummary()">Try Again</button>
      </div>
    `;
  }
}

// Toast helper (if not defined in app.js)
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Export functions
window.toggleGlp1 = toggleGlp1;
window.generateTargets = generateTargets;
window.saveProfile = saveProfile;
window.loadAISummary = loadAISummary;
window.initProfileTab = initProfileTab;
