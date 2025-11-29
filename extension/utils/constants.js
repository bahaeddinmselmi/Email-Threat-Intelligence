// Constants used across the extension
const CONSTANTS = {
  // No API needed - everything runs client-side!
  
  // Threat Levels
  THREAT_LEVELS: {
    SAFE: { value: 0, label: 'SAFE', color: '#10b981', range: [0, 30] },
    SUSPICIOUS: { value: 1, label: 'SUSPICIOUS', color: '#f59e0b', range: [31, 60] },
    DANGEROUS: { value: 2, label: 'DANGEROUS', color: '#ef4444', range: [61, 100] }
  },
  
  // Cache Duration (milliseconds)
  CACHE_DURATION: {
    DOMAIN: 24 * 60 * 60 * 1000, // 24 hours
    IP: 12 * 60 * 60 * 1000,     // 12 hours
    URL: 6 * 60 * 60 * 1000      // 6 hours
  },
  
  // Message Types
  MESSAGE_TYPES: {
    ANALYZE_EMAIL: 'ANALYZE_EMAIL',
    ANALYZE_URL: 'ANALYZE_URL',
    CHECK_DOMAIN: 'CHECK_DOMAIN',
    GET_RISK_SCORE: 'GET_RISK_SCORE',
    CACHE_GET: 'CACHE_GET',
    CACHE_SET: 'CACHE_SET',
    UPDATE_POPUP: 'UPDATE_POPUP'
  },
  
  // Storage Keys
  STORAGE_KEYS: {
    SETTINGS: 'eti_settings',
    CACHE: 'eti_cache',
    HISTORY: 'eti_history'
  },
  
  // Default Settings
  DEFAULT_SETTINGS: {
    enableSenderCheck: true,
    enableUrlCheck: true,
    enableContentAnalysis: true,
    enableAttachmentCheck: true,
    enableVisualWarnings: true,
    autoAnalyze: true,
    cacheEnabled: true,
    logHistory: true
  },
  
  // Selectors for Gmail
  GMAIL_SELECTORS: {
    EMAIL_VIEW: 'div[role="main"]',
    EMAIL_SUBJECT: 'h2.hP',
    EMAIL_SENDER: 'span.go',
    EMAIL_BODY: 'div.a3s',
    EMAIL_HEADERS: 'div.gE',
    ATTACHMENT_LIST: 'div.aZo',
    TOOLBAR: 'div.G-atb'
  },
  
  // Selectors for Outlook
  OUTLOOK_SELECTORS: {
    EMAIL_VIEW: 'div[role="region"]',
    EMAIL_SUBJECT: 'span[role="heading"]',
    EMAIL_SENDER: 'div[aria-label*="From"]',
    EMAIL_BODY: 'div[aria-label="Message body"]',
    EMAIL_HEADERS: 'div.well-header',
    ATTACHMENT_LIST: 'div[aria-label="Attachments"]',
    TOOLBAR: 'div[role="toolbar"]'
  },
  
  // Regex Patterns
  PATTERNS: {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
    IP: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    SHORT_URL: /bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co|short\.link/i
  },
  
  // UI Classes
  UI_CLASSES: {
    BANNER: 'eti-threat-banner',
    TOOLTIP: 'eti-threat-tooltip',
    BADGE: 'eti-threat-badge',
    DASHBOARD: 'eti-dashboard-panel',
    SPINNER: 'eti-spinner'
  },
  
  // Timing
  DEBOUNCE_DELAY: 500,
  ANALYSIS_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
}
