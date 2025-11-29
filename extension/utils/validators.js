// Validation utilities
const Validators = {
  /**
   * Validate email data structure
   */
  validateEmailData(data) {
    const required = ['sender', 'subject', 'body'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!Helpers.isValidEmail(data.sender)) {
      throw new Error(`Invalid sender email: ${data.sender}`);
    }
    
    return true;
  },

  /**
   * Validate URL
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string');
    }
    
    if (!Helpers.isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }
    
    return true;
  },

  /**
   * Validate domain
   */
  validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain must be a non-empty string');
    }
    
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*\.[a-zA-Z]{2,}$/;
    
    if (!domainPattern.test(domain)) {
      throw new Error(`Invalid domain: ${domain}`);
    }
    
    return true;
  },

  /**
   * Validate API response
   */
  validateApiResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid API response format');
    }
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return true;
  },

  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potential XSS vectors
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Validators;
}
