// Message Handler - Route messages between components
export class MessageHandler {
  constructor(apiClient, cacheManager) {
    this.apiClient = apiClient;
    this.cacheManager = cacheManager;
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message, sender) {
    const { type, data } = message;

    switch (type) {
      case 'ANALYZE_EMAIL':
        return await this.handleAnalyzeEmail(data);
      
      case 'ANALYZE_URL':
        return await this.handleAnalyzeUrl(data);
      
      case 'CHECK_DOMAIN':
        return await this.handleCheckDomain(data);
      
      case 'GET_RISK_SCORE':
        return await this.handleGetRiskScore(data);
      
      case 'CACHE_GET':
        return await this.handleCacheGet(data);
      
      case 'CACHE_SET':
        return await this.handleCacheSet(data);
      
      case 'UPDATE_POPUP':
        return await this.handleUpdatePopup(data);
      
      default:
        return { success: false, error: 'Unknown message type' };
    }
  }

  /**
   * Handle email analysis request
   */
  async handleAnalyzeEmail(emailData) {
    try {
      // Check cache first
      const cacheKey = emailData.sender + emailData.subject;
      const cached = await this.cacheManager.get('email', cacheKey);
      
      if (cached) {
        return { success: true, data: cached, cached: true };
      }

      // Call API
      const result = await this.apiClient.analyzeEmail(emailData);
      
      // Cache result
      await this.cacheManager.set('email', cacheKey, result);
      
      return { success: true, data: result, cached: false };
    } catch (error) {
      console.error('Email analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle URL analysis request
   */
  async handleAnalyzeUrl(url) {
    try {
      const cached = await this.cacheManager.get('url', url);
      if (cached) {
        return { success: true, data: cached, cached: true };
      }

      const result = await this.apiClient.analyzeUrl(url);
      await this.cacheManager.set('url', url, result);
      
      return { success: true, data: result, cached: false };
    } catch (error) {
      console.error('URL analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle domain check request
   */
  async handleCheckDomain(domain) {
    try {
      const cached = await this.cacheManager.get('domain', domain);
      if (cached) {
        return { success: true, data: cached, cached: true };
      }

      const result = await this.apiClient.checkDomain(domain);
      await this.cacheManager.set('domain', domain, result);
      
      return { success: true, data: result, cached: false };
    } catch (error) {
      console.error('Domain check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle risk score request
   */
  async handleGetRiskScore(data) {
    try {
      const result = await this.apiClient.getRiskScore(data);
      return { success: true, data: result };
    } catch (error) {
      console.error('Risk score calculation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle cache get request
   */
  async handleCacheGet({ type, identifier }) {
    try {
      const data = await this.cacheManager.get(type, identifier);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle cache set request
   */
  async handleCacheSet({ type, identifier, data, ttl }) {
    try {
      await this.cacheManager.set(type, identifier, data, ttl);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle popup update request
   */
  async handleUpdatePopup(data) {
    // Broadcast to all popup windows
    try {
      const views = chrome.extension.getViews({ type: 'popup' });
      views.forEach(view => {
        if (view.updatePopupData) {
          view.updatePopupData(data);
        }
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
