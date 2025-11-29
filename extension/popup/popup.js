// Popup JavaScript
(function() {
  'use strict';

  let currentTab = 'dashboard';
  let settings = {};

  /**
   * Initialize popup
   */
  async function init() {
    await loadSettings();
    await checkApiStatus();
    await loadStats();
    await loadHistory();
    await loadCurrentEmailInfo();
    
    setupEventListeners();
    setupTabNavigation();
    
    // Update cache stats
    updateCacheStats();
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Analyze current email button
    document.getElementById('analyzeCurrentBtn').addEventListener('click', analyzeCurrentEmail);
    
    // Quick URL check
    const quickUrlBtn = document.getElementById('quickUrlBtn');
    if (quickUrlBtn) {
      quickUrlBtn.addEventListener('click', handleQuickUrlCheck);
    }
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
    
    // Clear history
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
  }

  /**
   * Setup tab navigation
   */
  function setupTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchTab(targetTab);
      });
    });
  }

  /**
   * Switch between tabs
   */
  function switchTab(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}Tab`).classList.add('active');
    currentTab = tabName;
    
    // Load data for the tab
    if (tabName === 'history') {
      loadHistory();
    } else if (tabName === 'dashboard') {
      loadStats();
    }
  }

  /**
   * Handle quick URL check from popup
   */
  async function handleQuickUrlCheck() {
    const input = document.getElementById('quickUrlInput');
    const resultContainer = document.getElementById('quickUrlResult');
    const btn = document.getElementById('quickUrlBtn');

    if (!input || !resultContainer || !btn) return;

    const url = input.value.trim();
    if (!url) {
      showNotification('Please paste a URL to analyze.', 'error');
      return;
    }

    try {
      // Basic URL validation
      new URL(url);
    } catch (e) {
      showNotification('That does not look like a valid URL.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Checking...';

    try {
      if (typeof AnalyzerService === 'undefined') {
        throw new Error('Analyzer engine not available in popup');
      }

      const analyzer = new AnalyzerService();
      let data;
      
      try {
        data = await analyzer.analyzeUrl(url);
      } catch (analysisError) {
        // If analysis fails, do basic pattern-based checks
        console.warn('Full analysis failed, falling back to basic checks:', analysisError);
        data = await analyzer.analyzeUrlBasic ? analyzer.analyzeUrlBasic(url) : { 
          riskScore: 0, 
          flags: ['Basic analysis only'],
          url: url,
          resolvedUrl: url
        };
      }

      const riskScore = Math.max(0, Math.min(100, data.riskScore || 0));
      let level = 'SAFE';
      if (riskScore >= 61 || data.dangerous) {
        level = 'DANGEROUS';
      } else if (riskScore >= 31) {
        level = 'SUSPICIOUS';
      }

      const levelClass = level.toLowerCase();
      const displayUrl = escapeHtml((data.resolvedUrl || data.url || url));
      const flags = (data.flags || []).map(f => `<li>${escapeHtml(f)}</li>`).join('');

      resultContainer.innerHTML = `
        <div class="quick-url-card ${levelClass}">
          <div class="quick-url-header">
            <span class="quick-url-level">${level}</span>
            <span class="quick-url-score">${riskScore}/100</span>
          </div>
          <div class="quick-url-link">${displayUrl}</div>
          ${flags ? `<ul class="quick-url-flags">${flags}</ul>` : '<p class="quick-url-note">No specific red flags detected.</p>'}
        </div>
      `;

      showNotification('URL analyzed successfully!', 'success');
    } catch (error) {
      console.error('Quick URL check error:', error);
      showNotification('URL analysis failed: ' + error.message, 'error');
      resultContainer.innerHTML = `<p class="no-data">Analysis failed. Try opening Gmail/Outlook and retry, or check the URL format.</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Check';
    }
  }

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('eti_settings', (result) => {
        settings = result.eti_settings || getDefaultSettings();
        populateSettingsForm();
        resolve();
      });
    });
  }

  /**
   * Get default settings
   */
  function getDefaultSettings() {
    return {
      apiUrl: 'http://localhost:3000/api',
      enableSenderCheck: true,
      enableUrlCheck: true,
      enableContentAnalysis: true,
      enableAttachmentCheck: true,
      enableVisualWarnings: true,
      autoAnalyze: true,
      cacheEnabled: true,
      logHistory: true
    };
  }

  /**
   * Populate settings form with current values
   */
  function populateSettingsForm() {
    document.getElementById('apiUrl').value = settings.apiUrl;
    document.getElementById('enableSenderCheck').checked = settings.enableSenderCheck;
    document.getElementById('enableUrlCheck').checked = settings.enableUrlCheck;
    document.getElementById('enableContentAnalysis').checked = settings.enableContentAnalysis;
    document.getElementById('enableAttachmentCheck').checked = settings.enableAttachmentCheck;
    document.getElementById('enableVisualWarnings').checked = settings.enableVisualWarnings;
    document.getElementById('autoAnalyze').checked = settings.autoAnalyze;
    document.getElementById('cacheEnabled').checked = settings.cacheEnabled;
    document.getElementById('logHistory').checked = settings.logHistory;
  }

  /**
   * Save settings
   */
  async function saveSettings(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newSettings = {
      apiUrl: formData.get('apiUrl'),
      enableSenderCheck: formData.get('enableSenderCheck') === 'on',
      enableUrlCheck: formData.get('enableUrlCheck') === 'on',
      enableContentAnalysis: formData.get('enableContentAnalysis') === 'on',
      enableAttachmentCheck: formData.get('enableAttachmentCheck') === 'on',
      enableVisualWarnings: formData.get('enableVisualWarnings') === 'on',
      autoAnalyze: formData.get('autoAnalyze') === 'on',
      cacheEnabled: formData.get('cacheEnabled') === 'on',
      logHistory: formData.get('logHistory') === 'on'
    };

    await chrome.storage.sync.set({ eti_settings: newSettings });
    settings = newSettings;
    
    showNotification('Settings saved successfully!', 'success');
  }

  /**
   * Reset settings to defaults
   */
  async function resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      const defaults = getDefaultSettings();
      await chrome.storage.sync.set({ eti_settings: defaults });
      settings = defaults;
      populateSettingsForm();
      showNotification('Settings reset to defaults', 'success');
    }
  }

  /**
   * Check API status
   */
  async function checkApiStatus() {
    const statusIndicator = document.getElementById('apiStatus');
    const statusText = document.getElementById('apiStatusText');
    
    // Default: no backend needed, local engine only
    if (!settings.apiUrl || settings.apiUrl.startsWith('http://localhost')) {
      statusIndicator.style.color = '#10b981';
      statusText.textContent = 'Local engine active';
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${settings.apiUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        statusIndicator.style.color = '#10b981';
        statusText.textContent = 'API Connected';
      } else {
        throw new Error('API not responding');
      }
    } catch (error) {
      statusIndicator.style.color = '#ef4444';
      statusText.textContent = 'API Offline';
    }
  }

  /**
   * Analyze current email
   */
  async function analyzeCurrentEmail() {
    const btn = document.getElementById('analyzeCurrentBtn');
    btn.disabled = true;
    btn.textContent = 'Analyzing...';
    
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url || '';
      
      // Check if we're on Gmail or Outlook
      if (!url.includes('mail.google.com') && !url.includes('outlook.live.com') && !url.includes('outlook.office.com')) {
        showNotification('Please open Gmail or Outlook to analyze emails', 'error');
        return;
      }
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'ANALYZE_CURRENT_EMAIL'
      });
      
      if (response.success) {
        showNotification('Email analyzed successfully!', 'success');
        await loadStats();
        await loadCurrentEmailInfo();
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        showNotification('Please open an email in Gmail/Outlook and try again', 'error');
      } else {
        showNotification('Error: ' + error.message, 'error');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Analyze Current Email';
    }
  }

  /**
   * Load statistics
   */
  async function loadStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get('eti_history', (result) => {
        const history = result.eti_history || [];
        
        let safe = 0, suspicious = 0, dangerous = 0;
        
        history.forEach(entry => {
          if (entry.threatLevel === 'SAFE') safe++;
          else if (entry.threatLevel === 'SUSPICIOUS') suspicious++;
          else if (entry.threatLevel === 'DANGEROUS') dangerous++;
        });
        
        document.getElementById('statTotal').textContent = history.length;
        document.getElementById('statSafe').textContent = safe;
        document.getElementById('statSuspicious').textContent = suspicious;
        document.getElementById('statDangerous').textContent = dangerous;
        
        resolve();
      });
    });
  }

  /**
   * Load latest email into the current email gauge
   */
  async function loadCurrentEmailInfo() {
    return new Promise((resolve) => {
      const container = document.getElementById('currentEmailInfo');
      if (!container) {
        resolve();
        return;
      }

      chrome.storage.local.get('eti_history', (result) => {
        const history = result.eti_history || [];

        if (history.length === 0) {
          // Check if we're on Gmail/Outlook
          chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            const url = tab.url || '';
            let message = 'No email currently analyzed';
            let instructions = '';

            if (url.includes('mail.google.com')) {
              instructions = '<p class="no-data-instructions">Open any email in Gmail and it will be analyzed automatically.</p>';
            } else if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
              instructions = '<p class="no-data-instructions">Open any email in Outlook and it will be analyzed automatically.</p>';
            } else {
              instructions = '<p class="no-data-instructions">Open Gmail or Outlook in a tab to analyze emails.</p>';
            }

            container.innerHTML = `
              <p class="no-data">${message}</p>
              ${instructions}
            `;
            resolve();
          }).catch(() => {
            container.innerHTML = '<p class="no-data">No email currently analyzed</p>';
            resolve();
          });
          return;
        }

        const latest = history[0];
        const levelClass = latest.threatLevel.toLowerCase();

        container.innerHTML = `
          <div class="current-email-header">
            <div class="current-email-title">
              <span class="current-email-level ${levelClass}">${latest.threatLevel}</span>
              <span class="current-email-score">${latest.threatScore}/100</span>
            </div>
            <div class="current-email-meta">
              <div class="current-email-sender">${escapeHtml(latest.sender)}</div>
              <div class="current-email-subject">${escapeHtml(latest.subject)}</div>
            </div>
          </div>
          <div class="current-gauge">
            <div class="current-gauge-track">
              <div class="current-gauge-fill level-${levelClass}"></div>
            </div>
          </div>
        `;

        const fill = container.querySelector('.current-gauge-fill');
        if (fill) {
          requestAnimationFrame(() => {
            fill.style.width = `${latest.threatScore}%`;
          });
        }

        resolve();
      });
    });
  }

  /**
   * Load history
   */
  async function loadHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get('eti_history', (result) => {
        const history = result.eti_history || [];
        const historyList = document.getElementById('historyList');
        
        if (history.length === 0) {
          historyList.innerHTML = '<p class="no-data">No history available</p>';
          resolve();
          return;
        }
        
        historyList.innerHTML = history.map(entry => createHistoryItem(entry)).join('');
        resolve();
      });
    });
  }

  /**
   * Create history item HTML
   */
  function createHistoryItem(entry) {
    const levelClass = entry.threatLevel.toLowerCase();
    const date = new Date(entry.timestamp).toLocaleString();
    
    return `
      <div class="history-item ${levelClass}">
        <div class="history-header">
          <span class="history-level">${entry.threatLevel}</span>
          <span class="history-score">${entry.threatScore}/100</span>
        </div>
        <div class="history-details">
          <div class="history-sender">${escapeHtml(entry.sender)}</div>
          <div class="history-subject">${escapeHtml(entry.subject)}</div>
          <div class="history-meta">
            <span>${entry.platform}</span> • <span>${date}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Clear history
   */
  async function clearHistory() {
    if (confirm('Clear all analysis history?')) {
      await chrome.storage.local.set({ eti_history: [] });
      await loadHistory();
      await loadStats();
      await loadCurrentEmailInfo();
      showNotification('History cleared', 'success');
    }
  }

  /**
   * Update cache statistics
   */
  async function updateCacheStats() {
    chrome.storage.local.get('eti_cache', (result) => {
      const cache = result.eti_cache || {};
      const count = Object.keys(cache).length;
      document.getElementById('cacheStats').textContent = `Cache: ${count} entries`;
    });
  }

  /**
   * Show notification
   */
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Function to update popup data from background script
   */
  window.updatePopupData = function(data) {
    if (data.type === 'stats') {
      loadStats();
    } else if (data.type === 'history') {
      loadHistory();
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
