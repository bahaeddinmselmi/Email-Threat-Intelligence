// Helper utility functions
const Helpers = {
  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Extract email addresses from text
   */
  extractEmails(text) {
    if (!text) return [];
    const matches = text.match(CONSTANTS.PATTERNS.EMAIL);
    return matches ? [...new Set(matches)] : [];
  },

  /**
   * Extract URLs from text
   */
  extractUrls(text) {
    if (!text) return [];
    const matches = text.match(CONSTANTS.PATTERNS.URL);
    return matches ? [...new Set(matches)] : [];
  },

  /**
   * Extract domain from email
   */
  extractDomain(email) {
    if (!email) return null;
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  },

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  /**
   * Get threat level from score
   */
  getThreatLevel(score) {
    for (const [key, level] of Object.entries(CONSTANTS.THREAT_LEVELS)) {
      const [min, max] = level.range;
      if (score >= min && score <= max) {
        return level;
      }
    }
    return CONSTANTS.THREAT_LEVELS.SAFE;
  },

  /**
   * Format date to readable string
   */
  formatDate(date) {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  },

  /**
   * Parse email headers
   */
  parseHeaders(headerText) {
    const headers = {};
    if (!headerText) return headers;
    
    const lines = headerText.split('\n');
    let currentKey = null;
    
    for (const line of lines) {
      if (line.match(/^[\w-]+:/)) {
        const [key, ...valueParts] = line.split(':');
        currentKey = key.trim().toLowerCase();
        headers[currentKey] = valueParts.join(':').trim();
      } else if (currentKey && line.startsWith(' ')) {
        headers[currentKey] += ' ' + line.trim();
      }
    }
    
    return headers;
  },

  /**
   * Extract IP from Received header
   */
  extractIpFromReceived(receivedHeader) {
    if (!receivedHeader) return null;
    const match = receivedHeader.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
    return match ? match[1] : null;
  },

  /**
   * Generate unique ID
   */
  generateId() {
    return `eti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Wait for element to appear in DOM
   */
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  },

  /**
   * Check if string is valid email
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const value = email.trim();

    // Use a simple non-global regex here so repeated validations are stable.
    // CONSTANTS.PATTERNS.EMAIL is kept for extraction from text, not strict validation.
    const simpleEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return simpleEmailPattern.test(value);
  },

  /**
   * Check if string is valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Truncate text to specified length
   */
  truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry async function with exponential backoff
   */
  async retry(fn, attempts = CONSTANTS.RETRY_ATTEMPTS, delay = CONSTANTS.RETRY_DELAY) {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      await this.sleep(delay);
      return this.retry(fn, attempts - 1, delay * 2);
    }
  },

  /**
   * Log message with timestamp
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console[level](logMessage, data);
    } else {
      console[level](logMessage);
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Helpers;
}
