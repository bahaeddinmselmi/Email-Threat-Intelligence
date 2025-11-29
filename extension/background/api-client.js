// API Client - Handle communication with backend API
export class APIClient {
  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Set API base URL
   */
  setBaseUrl(url) {
    this.baseUrl = url;
  }

  /**
   * Make API request
   */
  async request(endpoint, method = 'POST', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this.timeout)
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Request timeout - API is not responding');
      }
      throw error;
    }
  }

  /**
   * Analyze email
   */
  async analyzeEmail(emailData) {
    return await this.request('/analyze-email', 'POST', emailData);
  }

  /**
   * Analyze URL
   */
  async analyzeUrl(url) {
    return await this.request('/analyze-url', 'POST', { url });
  }

  /**
   * Check domain reputation
   */
  async checkDomain(domain) {
    return await this.request('/check-domain', 'POST', { domain });
  }

  /**
   * Get risk score
   */
  async getRiskScore(data) {
    return await this.request('/risk-score', 'POST', data);
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
