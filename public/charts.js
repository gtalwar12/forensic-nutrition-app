// Charts Tab - 7-day calorie corridor visualization
// Uses Chart.js loaded from CDN

let calorieChart = null;
let chartInitialized = false;

// Tab switching logic
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Update active button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active panel
      tabPanels.forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Initialize chart when Charts tab is first opened
      if (tabId === 'charts' && !chartInitialized) {
        initCalorieChart();
        loadHistoryList();
        chartInitialized = true;
      }

      // Initialize profile tab
      if (tabId === 'profile' && window.initProfileTab) {
        window.initProfileTab();
      }
    });
  });
});

async function initCalorieChart() {
  const ctx = document.getElementById('calorie-chart');
  if (!ctx) return;

  try {
    const response = await fetch('/history');
    const history = await response.json();

    // Build last 7 days with data
    const labels = [];
    const dataMap = {};

    // Create map of existing data
    history.forEach(day => {
      dataMap[day.date] = {
        low: day.total_low || 0,
        high: day.total_high || 0
      };
    });

    // Generate last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

      labels.push(dayLabel);

      const dayData = dataMap[dateStr];
      if (dayData && (dayData.low > 0 || dayData.high > 0)) {
        chartData.push([dayData.low, dayData.high]);
      } else {
        chartData.push(null);
      }
    }

    // Destroy existing chart if present
    if (calorieChart) {
      calorieChart.destroy();
    }

    // Create floating bar chart
    calorieChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Calorie Corridor',
          data: chartData,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const range = context.raw;
                if (!range) return 'No data';
                return `${range[0].toLocaleString()} - ${range[1].toLocaleString()} kcal`;
              }
            },
            backgroundColor: '#1a1a1a',
            titleColor: '#fff',
            bodyColor: '#888',
            borderColor: '#333',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              color: '#333',
              drawBorder: false
            },
            ticks: {
              color: '#888',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: '#333',
              drawBorder: false
            },
            ticks: {
              color: '#888',
              font: {
                size: 11
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            min: 0,
            suggestedMax: 2500
          }
        }
      }
    });

  } catch (error) {
    console.error('Failed to load calorie chart:', error);
  }
}

async function loadHistoryList() {
  const container = document.getElementById('history-list');
  if (!container) return;

  try {
    const response = await fetch('/history');
    const history = await response.json();

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No meal history yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(day => {
      const date = new Date(day.date + 'T12:00:00');
      const isToday = day.date === new Date().toISOString().split('T')[0];
      const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return `
        <div class="history-day" onclick="showDayDetail('${day.date}')">
          <div>
            <div class="history-date">${dayName}</div>
            <div class="history-date-sub">${dateStr}</div>
          </div>
          <div class="history-cals">
            <div class="history-range">
              <span style="color: #22c55e">${(day.total_low || 0).toLocaleString()}</span>
              <span style="color: #555"> — </span>
              <span style="color: #f59e0b">${(day.total_high || 0).toLocaleString()}</span>
            </div>
            <div class="history-meals">${day.meals} meal${day.meals !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load history:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>Failed to load history</p>
      </div>
    `;
  }
}

// Show day detail view
async function showDayDetail(dateStr) {
  const historyCard = document.getElementById('history-card');
  const chartCard = historyCard.previousElementSibling;
  const dayDetail = document.getElementById('day-detail');

  try {
    const response = await fetch(`/meals/${dateStr}`);
    const data = await response.json();

    const date = new Date(dateStr + 'T12:00:00');
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Set title
    document.getElementById('detail-title').textContent = `${dayName}, ${fullDate}`;

    // Set summary
    document.getElementById('detail-summary').innerHTML = `
      <span><strong style="color: #22c55e">${data.totals.cal_low.toLocaleString()}</strong> — <strong style="color: #f59e0b">${data.totals.cal_high.toLocaleString()}</strong> kcal</span>
      <span style="color: #3b82f6">${data.totals.protein_g}g protein</span>
      <span style="color: #f59e0b">${data.totals.carbs_g}g carbs</span>
      <span style="color: #a78bfa">${data.totals.fat_g}g fat</span>
    `;

    // Set meals
    document.getElementById('detail-meals').innerHTML = data.meals.map(meal => {
      const time = new Date(meal.time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const itemsHtml = meal.items.map(item => `
        <div class="detail-item">
          <span class="detail-item-name">${item.name}</span>
          <span class="detail-item-portion">${item.portion}</span>
          <span class="detail-item-cals">${item.cal_low}–${item.cal_high}</span>
        </div>
      `).join('');

      return `
        <div class="detail-meal">
          <div class="detail-meal-time">${time}</div>
          <div class="detail-meal-cals">
            <span style="color: #22c55e">${meal.cal_low}</span>
            <span style="color: #555"> — </span>
            <span style="color: #f59e0b">${meal.cal_high}</span>
            <span style="color: #888"> kcal</span>
          </div>
          <div class="detail-meal-items">${itemsHtml}</div>
        </div>
      `;
    }).join('');

    // Hide history, show detail
    historyCard.style.display = 'none';
    chartCard.style.display = 'none';
    dayDetail.classList.add('active');

  } catch (error) {
    console.error('Failed to load day detail:', error);
  }
}

// Hide day detail, show history
function hideDayDetail() {
  const historyCard = document.getElementById('history-card');
  const chartCard = historyCard.previousElementSibling;
  const dayDetail = document.getElementById('day-detail');

  dayDetail.classList.remove('active');
  historyCard.style.display = 'block';
  chartCard.style.display = 'block';
}

// Refresh chart and history when new data is added
function refreshChartsTab() {
  if (chartInitialized) {
    initCalorieChart();
    loadHistoryList();
  }
}

// Export for use in app.js and inline onclick
window.refreshChartsTab = refreshChartsTab;
window.showDayDetail = showDayDetail;
window.hideDayDetail = hideDayDetail;
