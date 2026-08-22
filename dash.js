// Global variables to store data
let allCSVRows = [];
let allLocData = [];
let mergedData = [];
let levelChartInstance;
let csvDeviceStatusChartInstance;
let batteryLevelChartInstance;

/**
 * Loads data from both DWLR_Sample_Data_Full.csv and loc.csv,
 * merges them, and then initializes the dashboard.
 */
async function loadCSVAndRenderCharts() {
  try {
    // Fetch both CSV files concurrently
    const [csvResponse, locResponse] = await Promise.all([
      fetch('DWLR_Sample_Data_Full.csv'),
      fetch('loc.csv')
    ]);

    const csvText = await csvResponse.text();
    const locText = await locResponse.text();

    // Parse DWLR_Sample_Data_Full.csv
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        allCSVRows = results.data;
        mergeDataAndInitialize(); // Attempt to merge and initialize after parsing
      }
    });

    // Parse loc.csv
    Papa.parse(locText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        allLocData = results.data;
        mergeDataAndInitialize(); // Attempt to merge and initialize after parsing
      }
    });

  } catch (error) {
    console.error('Error loading CSV files:', error);
  }
}

/**
 * Merges the DWLR data with location data once both are loaded.
 * Initializes the dashboard if not already initialized.
 */
function mergeDataAndInitialize() {
  // Ensure both datasets are loaded before merging
  if (allCSVRows.length > 0 && allLocData.length > 0) {
    // Prevent re-initialization if already done
    if (window.dashboardInitialized) {
      return;
    }

    mergedData = allCSVRows.map(row => {
      // Find corresponding location info using Device_ID
      const locationInfo = allLocData.find(loc => loc.Device_ID === row.Device_ID);
      return {
        ...row,
        // Add location details from loc.csv, defaulting to 'Unknown' or null if not found
        Location_Name: locationInfo ? locationInfo.Location_Name : 'Unknown',
        Location_Longitude: locationInfo ? locationInfo.Location_Longitude : null,
        Location_Latitude: locationInfo ? locationInfo.Location_Latitude : null,
      };
    });

    // Mark dashboard as initialized to prevent redundant calls
    window.dashboardInitialized = true;
    initializeDashboard();
  }
}

/**
 * Initializes the dashboard components after data is merged.
 */
function initializeDashboard() {
  if (mergedData.length === 0) {
    console.warn('Merged data is empty, cannot initialize dashboard.');
    return;
  }

  populateFilterDropdowns();
  setupEventListeners();
  // Render dashboard with all merged data initially
  updateDashboard(mergedData);
}

/**
 * Populates the region and location filter dropdowns based on available data.
 */
function populateFilterDropdowns() {
  const regions = [...new Set(mergedData.map(row => row.Location))].filter(Boolean).sort();
  const locations = [...new Set(mergedData.map(row => row.Location_Name))].filter(Boolean).sort();

  const regionFilter = document.getElementById('regionFilter');
  const locationFilter = document.getElementById('locationFilter');
  const regionBatterySelect = document.getElementById('regionBatterySelect');
  const regionStatusSelect = document.getElementById('regionStatusSelect');

  // Clear existing options and add 'All' option
  regionFilter.innerHTML = '<option value="">All Regions</option>';
  locationFilter.innerHTML = '<option value="">All Locations</option>';
  regionBatterySelect.innerHTML = '<option value="">All Regions</option>';
  regionStatusSelect.innerHTML = '<option value="">All Regions</option>';

  // Populate main region filter
  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionFilter.appendChild(option);
  });

  // Populate main location filter
  locations.forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });

  // Populate region dropdowns for donut charts
  regions.forEach(region => {
    const option1 = document.createElement('option');
    option1.value = region;
    option1.textContent = region;
    regionBatterySelect.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = region;
    option2.textContent = region;
    regionStatusSelect.appendChild(option2);
  });
}

/**
 * Sets up event listeners for filter changes and chart downloads.
 */
function setupEventListeners() {
  document.getElementById('regionFilter').addEventListener('change', applyFilters);
  document.getElementById('locationFilter').addEventListener('change', applyFilters);
  // Listen for 'input' for immediate filtering as user types
  document.getElementById('searchInput').addEventListener('input', applyFilters);

  // Donut chart specific dropdowns will trigger re-rendering of only their charts
  document.getElementById('regionBatterySelect').addEventListener('change', () => {
    const currentFilteredData = getCurrentFilteredData(); // Get data based on main filters
    renderBatteryLevelChart(currentFilteredData); // Pass it to the function
  });
  document.getElementById('regionStatusSelect').addEventListener('change', () => {
    const currentFilteredData = getCurrentFilteredData(); // Get data based on main filters
    renderDeviceStatusChart(currentFilteredData); // Pass it to the function
  });
}

/**
 * Retrieves the currently filtered data based on selected main filters and search input.
 * @returns {Array<Object>} The array of filtered data rows.
 */
function getCurrentFilteredData() {
  let currentFilteredRows = [...mergedData];

  const selectedRegion = document.getElementById('regionFilter').value;
  const selectedLocation = document.getElementById('locationFilter').value;
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  // Apply region filter
  if (selectedRegion) {
    currentFilteredRows = currentFilteredRows.filter(row => row.Location === selectedRegion);
  }

  // Apply location filter
  if (selectedLocation) {
    currentFilteredRows = currentFilteredRows.filter(row => row.Location_Name === selectedLocation);
  }

  // Apply search term filter to Device_ID or Location_Name
  if (searchTerm) {
    currentFilteredRows = currentFilteredRows.filter(row =>
      (row.Device_ID && String(row.Device_ID).toLowerCase().includes(searchTerm)) ||
      (row.Location_Name && String(row.Location_Name).toLowerCase().includes(searchTerm))
    );
  }
  return currentFilteredRows;
}

/**
 * Applies all active filters and updates the dashboard elements.
 */
function applyFilters() {
  const filteredRows = getCurrentFilteredData();
  updateDashboard(filteredRows);
}

/**
 * Updates all dashboard cards and charts with the provided data.
 * @param {Array<Object>} rowsToDisplay - The data rows to be used for updates.
 */
function updateDashboard(rowsToDisplay) {
  updateCardMetrics(rowsToDisplay);
  renderWaterLevelChart(rowsToDisplay);
  // Donut charts receive the already main-filtered data
  renderDeviceStatusChart(rowsToDisplay);
  renderBatteryLevelChart(rowsToDisplay);
}

/**
 * Processes data and updates the various metric cards on the dashboard.
 * @param {Array<Object>} rows - The data rows (already filtered) to calculate metrics from.
 */
function updateCardMetrics(rows) {
  const uniqueDevices = new Set(rows.map(row => row.Device_ID)).size;
  const offlineDevices = new Set(rows.filter(row => row.Signal_Status === 'Offline').map(row => row.Device_ID)).size;

  let totalWaterLevel = 0;
  let waterLevelCount = 0;
  let maxWaterLevel = -Infinity;
  let minWaterLevel = Infinity;
  let activeAlerts = 0;
  let totalBatteryLevel = 0;
  let batteryLevelCount = 0;
  const deviceUptimeStatus = {}; // {deviceID: [online_readings, total_readings]}

  rows.forEach(row => {
    // Calculate water level metrics
    if (typeof row.Water_Level_m === 'number') {
      totalWaterLevel += row.Water_Level_m;
      waterLevelCount++;
      if (row.Water_Level_m > maxWaterLevel) maxWaterLevel = row.Water_Level_m;
      if (row.Water_Level_m < minWaterLevel) minWaterLevel = row.Water_Level_m;
    }

    // Count active alerts (excluding 'Normal')
    if (row.Anomaly_Flag && row.Anomaly_Flag.toLowerCase() !== 'normal') {
      activeAlerts++;
    }

    // Accumulate battery levels for average calculation
    if (typeof row.Battery_Level === 'number') {
      totalBatteryLevel += row.Battery_Level;
      batteryLevelCount++;
    }

    // Track device uptime status
    if (row.Device_ID) {
      if (!deviceUptimeStatus[row.Device_ID]) {
        deviceUptimeStatus[row.Device_ID] = [0, 0];
      }
      deviceUptimeStatus[row.Device_ID][1]++; // Increment total readings for this device
      if (row.Signal_Status === 'Online') {
        deviceUptimeStatus[row.Device_ID][0]++; // Increment online readings for this device
      }
    }
  });

  const avgWaterLevel = waterLevelCount > 0 ? (totalWaterLevel / waterLevelCount).toFixed(2) : '0';
  const avgBatteryLevel = batteryLevelCount > 0 ? (totalBatteryLevel / batteryLevelCount).toFixed(0) : '0';

  // Calculate overall device uptime percentage across all unique devices
  let totalOnlineReadings = 0;
  let totalDeviceReadings = 0;
  for (const deviceId in deviceUptimeStatus) {
    totalOnlineReadings += deviceUptimeStatus[deviceId][0];
    totalDeviceReadings += deviceUptimeStatus[deviceId][1];
  }
  const deviceUptime = totalDeviceReadings > 0 ? ((totalOnlineReadings / totalDeviceReadings) * 100).toFixed(1) : '0';


  // Update HTML elements with calculated metrics
  document.getElementById('totalDevices').textContent = uniqueDevices;
  document.getElementById('offlineDevices').textContent = offlineDevices;
  document.getElementById('deviceUptime').textContent = `${deviceUptime}%`;
  document.getElementById('deviceUptimeProgress').value = parseFloat(deviceUptime);
  document.getElementById('batteryHealth').textContent = `🔋 ${avgBatteryLevel}%`;
  document.getElementById('batteryHealthProgress').value = parseFloat(avgBatteryLevel);
  document.getElementById('activeAlerts').textContent = activeAlerts;
  document.getElementById('avgWaterLevel').textContent = `${avgWaterLevel} m`;
  document.getElementById('maxWaterLevel').textContent = maxWaterLevel === -Infinity ? 'N/A' : `${maxWaterLevel.toFixed(2)} m`;
  document.getElementById('minWaterLevel').textContent = minWaterLevel === Infinity ? 'N/A' : `${minWaterLevel.toFixed(2)} m`;
}

/**
 * Renders the Water Level Trend line chart.
 * @param {Array<Object>} baseRows - The data rows (already filtered by main controls) for the chart.
 */
function renderWaterLevelChart(baseRows) {
  // Destroy previous chart instance to prevent memory leaks and rendering issues
  if (levelChartInstance) {
    levelChartInstance.destroy();
  }

  const groupedByDate = {};
  baseRows.forEach(row => {
    // Ensure timestamp and water level data are valid
    if (!row['Timestamp'] || typeof row['Water_Level_m'] !== 'number') return;

    // Parse date from 'DD-MM-YYYY HH:MM' format to 'YYYY-MM-DD'
    const [day, month, yearTime] = row['Timestamp'].split('-');
    const [year] = yearTime.split(' ');
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(row['Water_Level_m']);
  });

  // Sort dates to ensure correct order on the chart
  const sortedDates = Object.keys(groupedByDate).sort();
  // Get data for the last 7 available dates
  const last7Dates = sortedDates.slice(-7);

  const chartLabels = last7Dates;
  const chartData = last7Dates.map(date => {
    const levels = groupedByDate[date];
    // Calculate average water level for each day
    const avgLevel = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    return parseFloat(avgLevel.toFixed(2)); // Ensure data is numeric
  });

  const ctx = document.getElementById('levelChart').getContext('2d');
  levelChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Average Water Level (m)',
        data: chartData,
        borderColor: '#004d99', // Primary blue for the line
        backgroundColor: 'rgba(0, 77, 153, 0.2)', // Light shade for the area fill
        fill: true,
        tension: 0.3, // Smooth the line
        pointRadius: 5, // Make points visible
        pointBackgroundColor: '#004d99',
        pointBorderColor: '#fff',
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows flexible height based on container
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.raw} m`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Water Level (m)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Date',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            display: false // Hide x-axis grid lines
          }
        }
      }
    }
  });
}

/**
 * Renders the Device Status donut chart.
 * @param {Array<Object>} baseRows - The data rows (already filtered by main controls) for the chart.
 */
function renderDeviceStatusChart(baseRows) {
  if (csvDeviceStatusChartInstance) {
    csvDeviceStatusChartInstance.destroy();
  }

  // Apply secondary filter for the donut chart's own region selection
  const selectedRegion = document.getElementById('regionStatusSelect').value;
  let rows = baseRows;
  if (selectedRegion) {
    rows = baseRows.filter(row => row.Location === selectedRegion);
  }

  const deviceStatusCounts = {
    Online: 0,
    Offline: 0
  };

  rows.forEach(row => {
    if (row.Signal_Status) {
      // Ensure status is correctly capitalized for display if needed, but count as lowercase
      const statusKey = row.Signal_Status.charAt(0).toUpperCase() + row.Signal_Status.slice(1).toLowerCase();
      if (deviceStatusCounts.hasOwnProperty(statusKey)) {
        deviceStatusCounts[statusKey]++;
      }
    }
  });

  const ctx = document.getElementById('csvDeviceStatusChart').getContext('2d');
  csvDeviceStatusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Online', 'Offline'],
      datasets: [{
        data: [deviceStatusCounts.Online, deviceStatusCounts.Offline],
        backgroundColor: ['#27ae60', '#e74c3c'], // Green for Online, Red for Offline
        hoverOffset: 8, // Increased hover offset for better visual feedback
        borderColor: '#ffffff', // White border between segments
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 14
            },
            boxWidth: 20
          }
        },
        title: {
          display: false, // Title moved to HTML heading
          text: 'Device Status Distribution'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.raw;
              const total = context.dataset.data.reduce((acc, current) => acc + current, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Renders the Battery Level Distribution donut chart.
 * @param {Array<Object>} baseRows - The data rows (already filtered by main controls) for the chart.
 */
function renderBatteryLevelChart(baseRows) {
  if (batteryLevelChartInstance) {
    batteryLevelChartInstance.destroy();
  }

  // Apply secondary filter for the donut chart's own region selection
  const selectedRegion = document.getElementById('regionBatterySelect').value;
  let rows = baseRows;
  if (selectedRegion) {
    rows = baseRows.filter(row => row.Location === selectedRegion);
  }

  let batteryLow = 0; // 0-20%
  let batteryMedium = 0; // 21-60%
  let batteryHigh = 0; // 61-100%

  rows.forEach(row => {
    if (typeof row.Battery_Level === 'number') {
      if (row.Battery_Level <= 20) {
        batteryLow++;
      } else if (row.Battery_Level <= 60) {
        batteryMedium++;
      } else {
        batteryHigh++;
      }
    }
  });

  const ctx = document.getElementById('batteryLevelChart').getContext('2d');
  batteryLevelChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low (0–20%)', 'Medium (21–60%)', 'High (61–100%)'],
      datasets: [{
        data: [batteryLow, batteryMedium, batteryHigh],
        backgroundColor: ['#e74c3c', '#f39c12', '#27ae60'], // Red, Orange, Green
        hoverOffset: 8,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 14
            },
            boxWidth: 20
          }
        },
        title: {
          display: false, // Title moved to HTML heading
          text: 'Battery Level Distribution'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.raw;
              const total = context.dataset.data.reduce((acc, current) => acc + current, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Updates the digital clock displayed in the top bar.
 */
function updateClock() {
  const clockElem = document.getElementById('clock');
  if (clockElem) {
    clockElem.textContent = new Date().toLocaleTimeString();
  }
}

/**
 * Toggles dark mode on or off by adding/removing the 'dark' class to the body.
 */
function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

/**
 * Allows downloading of a Chart.js canvas as a PNG image.
 * @param {string} chartId - The ID of the canvas element to download.
 */
function downloadChart(chartId) {
  const chartElem = document.getElementById(chartId);
  if (!chartElem) {
    console.error(`Chart with id "${chartId}" not found for download.`);
    return;
  }
  const link = document.createElement('a');
  link.download = `${chartId}.png`; // Suggested filename
  link.href = chartElem.toDataURL('image/png'); // Get data URL of the canvas
  link.click(); // Programmatically click the link to trigger download
}

/**
 * Sets up click listeners for all chart download buttons.
 */
function setupDownloadButtons() {
  const mapping = [
    // Corrected chartId mapping based on dash.html structure
    { btnSelector: '#donut-charts-container .donut-chart-wrapper:nth-child(1) button', chartId: 'csvDeviceStatusChart' },
    { btnSelector: '#donut-charts-container .donut-chart-wrapper:nth-child(2) button', chartId: 'batteryLevelChart' },
    // Assuming 'levelChart' download button is handled separately in HTML, if not, add here:
    { btnSelector: '#level-trend button', chartId: 'levelChart' }
  ];

  mapping.forEach(({ btnSelector, chartId }) => {
    const btn = document.querySelector(btnSelector);
    if (btn) {
      btn.addEventListener('click', () => {
        downloadChart(chartId);
      });
    }
  });
}

// Ensure all necessary initialization functions run when the window loads.
window.onload = () => {
  updateClock();
  setInterval(updateClock, 1000); // Update clock every second
  loadCSVAndRenderCharts(); // Start loading data and rendering dashboard
  setupDownloadButtons(); // Set up download functionality for charts
};
// In dash.js

// Add this to your global variables section
let anomalyChartInstance;

// Add this new function
function renderAnomalyChart(baseRows) {
  if (anomalyChartInstance) {
    anomalyChartInstance.destroy();
  }

  const anomalyCounts = {};
  baseRows.forEach(row => {
    // Only count if Anomaly_Flag exists and is not 'Normal' (case-insensitive check)
    if (row.Anomaly_Flag && row.Anomaly_Flag.toLowerCase() !== 'normal') {
      const flag = row.Anomaly_Flag;
      anomalyCounts[flag] = (anomalyCounts[flag] || 0) + 1;
    }
  });

  const labels = Object.keys(anomalyCounts);
  const data = Object.values(anomalyCounts);
  const backgroundColors = [
    '#e74c3c', // danger color
    '#f39c12', // warning color
    '#3498db', // info color
    '#9b59b6', // purple
    '#1abc9c', // turquoise
    '#2ecc71'  // another green
  ]; // You'll need enough distinct colors for your anomaly types

  const ctx = document.getElementById('anomalyChart').getContext('2d');
  anomalyChartInstance = new Chart(ctx, {
    type: 'bar', // A 'bar' chart is often good for showing counts of distinct categories
    data: {
      labels: labels,
      datasets: [{
        label: 'Number of Occurrences',
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length), // Assign colors based on count of labels
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false, // Title is in HTML heading
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.label}: ${context.raw}`;
            }
          }
        }
      },
      scales: {
  y: {
    beginAtZero: true,
    title: {
      display: true,
      text: 'Count'
    },
    ticks: {
      // Optional: You can also format the ticks if needed
    },
    // Extend max value by 2 dynamically using suggestedMax
    afterDataLimits: (scale) => {
      scale.max += 2;
    }
  },
  x: {
    title: {
      display: true,
      text: 'Anomaly Type'
    }
  }
}

    }
  });
}

// Call this in the existing updateDashboard function:
function updateDashboard(rowsToDisplay) {
  updateCardMetrics(rowsToDisplay);
  renderWaterLevelChart(rowsToDisplay);
  renderDeviceStatusChart(rowsToDisplay);
  renderBatteryLevelChart(rowsToDisplay);
  renderAnomalyChart(rowsToDisplay); // Add this line for your new chart
}

// Update setupDownloadButtons in dash.js to include the new chart
function setupDownloadButtons() {
  const mapping = [
    { btnSelector: '#donut-charts-container .donut-chart-wrapper:nth-child(1) button', chartId: 'csvDeviceStatusChart' },
    { btnSelector: '#donut-charts-container .donut-chart-wrapper:nth-child(2) button', chartId: 'batteryLevelChart' },
    { btnSelector: '#level-trend button', chartId: 'levelChart' },
    { btnSelector: '#anomaly-distribution-section button', chartId: 'anomalyChart' } // Add this line
  ];

  mapping.forEach(({ btnSelector, chartId }) => {
    const btn = document.querySelector(btnSelector);
    if (btn) {
      btn.addEventListener('click', () => {
        downloadChart(chartId);
      });
    }
  });
}