// Gmail Content Script - Monitor and analyze emails in Gmail
(function() {
  'use strict';

  let emailParser;
  let uiInjector;
  let currentEmailId = null;
  let analysisInProgress = false;

  /**
   * Initialize Gmail integration
   */
  function init() {
    Helpers.log('info', 'Initializing Gmail Email Threat Intelligence');
    
    emailParser = new EmailParser('gmail');
    uiInjector = new UIInjector('gmail');

    // Wait for Gmail to load
    waitForGmailLoad().then(() => {
      setupEmailObserver();
      checkCurrentEmail();
    });
  }

  /**
   * Wait for Gmail interface to fully load
   */
  function waitForGmailLoad() {
    return Helpers.waitForElement('div[role="main"]', 15000);
  }

  /**
   * Setup observer to detect email changes
   */
  function setupEmailObserver() {
    // Monitor URL changes (Gmail is a single-page app)
    let lastUrl = window.location.href;
    
    const urlObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        handleUrlChange(currentUrl);
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Monitor DOM changes for email content
    const emailContainer = document.querySelector('div[role="main"]');
    if (emailContainer) {
      const emailObserver = new MutationObserver(
        Helpers.debounce(() => {
          checkCurrentEmail();
        }, CONSTANTS.DEBOUNCE_DELAY)
      );

      emailObserver.observe(emailContainer, {
        childList: true,
        subtree: true
      });
    }

    // Listen for keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Gmail keyboard shortcuts: j (next), k (previous)
      if (e.key === 'j' || e.key === 'k') {
        setTimeout(() => checkCurrentEmail(), 500);
      }
    });
  }

  /**
   * Handle URL changes in Gmail
   */
  function handleUrlChange(url) {
    Helpers.log('info', 'Gmail URL changed', url);
    
    // Check if viewing an email
    if (url.includes('#inbox/') || url.includes('#all/') || url.includes('#label/')) {
      setTimeout(() => checkCurrentEmail(), 1000);
    } else {
      // Not viewing email, cleanup
      uiInjector.cleanup();
      currentEmailId = null;
    }
  }

  /**
   * Check and analyze current email
   */
  async function checkCurrentEmail() {
    if (analysisInProgress) {
      Helpers.log('info', 'Analysis already in progress, skipping');
      return;
    }

    if (!emailParser.isEmailOpen()) {
      Helpers.log('info', 'No email currently open');
      return;
    }

    const emailId = emailParser.getEmailId();
    if (!emailId || emailId === currentEmailId) {
      return; // Same email, no need to re-analyze
    }

    Helpers.log('info', 'New email detected, analyzing', emailId);
    currentEmailId = emailId;

    // Parse email data
    const emailData = emailParser.parseEmail();
    if (!emailData) {
      Helpers.log('error', 'Failed to parse email data');
      return;
    }

    // Check settings
    const settings = await getSettings();
    if (!settings.autoAnalyze) {
      Helpers.log('info', 'Auto-analyze disabled, skipping');
      return;
    }

    // Start analysis
    await analyzeEmail(emailData);
  }

  /**
   * Analyze email and display results
   */
  async function analyzeEmail(emailData) {
    analysisInProgress = true;
    uiInjector.showLoading();

    try {
      // Analyze directly in content script (no backend needed!)
      const analyzer = new AnalyzerService();
      const threatData = await analyzer.analyzeEmail(emailData);

      if (threatData) {
        
        // Display results
        uiInjector.hideLoading();
        uiInjector.injectThreatBanner(threatData);

        // Highlight dangerous URLs
        if (threatData.urlAnalysis && threatData.urlAnalysis.dangerousUrls) {
          uiInjector.highlightDangerousUrls(threatData.urlAnalysis.dangerousUrls);
        }

        // Log to history
        logToHistory(emailData, threatData);
        
        Helpers.log('info', 'Email analysis complete', threatData);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      Helpers.log('error', 'Failed to analyze email', error);
      uiInjector.hideLoading();
      showError('Failed to analyze email: ' + error.message);
    } finally {
      analysisInProgress = false;
    }
  }

  /**
   * Get user settings
   */
  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(CONSTANTS.STORAGE_KEYS.SETTINGS, (result) => {
        resolve(result[CONSTANTS.STORAGE_KEYS.SETTINGS] || CONSTANTS.DEFAULT_SETTINGS);
      });
    });
  }

  /**
   * Log analysis to history
   */
  async function logToHistory(emailData, threatData) {
    const settings = await getSettings();
    if (!settings.logHistory) return;

    const historyEntry = {
      id: Helpers.generateId(),
      timestamp: Date.now(),
      sender: emailData.sender,
      subject: emailData.subject,
      threatScore: threatData.threatScore,
      threatLevel: Helpers.getThreatLevel(threatData.threatScore).label,
      platform: 'gmail'
    };

    chrome.storage.local.get(CONSTANTS.STORAGE_KEYS.HISTORY, (result) => {
      const history = result[CONSTANTS.STORAGE_KEYS.HISTORY] || [];
      history.unshift(historyEntry);
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.splice(100);
      }

      chrome.storage.local.set({
        [CONSTANTS.STORAGE_KEYS.HISTORY]: history
      });
    });
  }

  /**
   * Show error message
   */
  function showError(message) {
    const errorBanner = document.createElement('div');
    errorBanner.className = 'eti-error-banner';
    errorBanner.textContent = message;
    errorBanner.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(errorBanner);

    setTimeout(() => {
      errorBanner.remove();
    }, 5000);
  }

  /**
   * Listen for messages from popup/background
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYZE_CURRENT_EMAIL') {
      const emailData = emailParser.parseEmail();
      if (emailData) {
        analyzeEmail(emailData).then(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'No email currently open' });
      }
      return true; // Keep channel open for async response
    }

    if (message.type === 'GET_CURRENT_EMAIL') {
      const emailData = emailParser.parseEmail();
      sendResponse({ success: true, data: emailData });
      return false;
    }

    if (message.type === 'ANALYZE_URL_MANUAL') {
      const { url } = message;
      if (!url) {
        sendResponse({ success: false, error: 'No URL provided' });
        return false;
      }

      try {
        const analyzer = new AnalyzerService();
        analyzer.analyzeUrl(url)
          .then((result) => {
            sendResponse({ success: true, data: result });
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message });
          });
        return true; // async
      } catch (error) {
        sendResponse({ success: false, error: error.message });
        return false;
      }
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
