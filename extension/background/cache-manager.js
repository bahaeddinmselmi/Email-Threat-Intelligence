// Cache Manager - Manage cached analysis results
export class CacheManager {
  constructor() {
    this.storageKey = 'eti_cache';
  }

  /**
   * Generate cache key
   */
  generateKey(type, identifier) {
    return `${type}:${identifier}`;
  }

  /**
   * Get cached data
   */
  async get(type, identifier) {
    const key = this.generateKey(type, identifier);
    
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        const cache = result[this.storageKey] || {};
        const cached = cache[key];

        if (!cached) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > cached.expiresAt) {
          resolve(null);
          return;
        }

        console.log('Cache hit:', key);
        resolve(cached.data);
      });
    });
  }

  /**
   * Set cached data
   */
  async set(type, identifier, data, ttl = null) {
    const key = this.generateKey(type, identifier);
    
    // Determine TTL based on type
    if (!ttl) {
      const ttlMap = {
        domain: 24 * 60 * 60 * 1000,  // 24 hours
        ip: 12 * 60 * 60 * 1000,       // 12 hours
        url: 6 * 60 * 60 * 1000,       // 6 hours
        email: 1 * 60 * 60 * 1000      // 1 hour
      };
      ttl = ttlMap[type] || 60 * 60 * 1000; // Default 1 hour
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        const cache = result[this.storageKey] || {};
        
        cache[key] = {
          data,
          expiresAt: Date.now() + ttl,
          createdAt: Date.now()
        };

        chrome.storage.local.set({ [this.storageKey]: cache }, () => {
          console.log('Cache set:', key);
          resolve();
        });
      });
    });
  }

  /**
   * Clear specific cache entry
   */
  async clear(type, identifier) {
    const key = this.generateKey(type, identifier);
    
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        const cache = result[this.storageKey] || {};
        delete cache[key];
        
        chrome.storage.local.set({ [this.storageKey]: cache }, resolve);
      });
    });
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: {} }, resolve);
    });
  }

  /**
   * Cleanup expired entries
   */
  async cleanup() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        const cache = result[this.storageKey] || {};
        const now = Date.now();
        let cleaned = 0;

        for (const key in cache) {
          if (now > cache[key].expiresAt) {
            delete cache[key];
            cleaned++;
          }
        }

        if (cleaned > 0) {
          chrome.storage.local.set({ [this.storageKey]: cache }, () => {
            console.log(`Cache cleanup: removed ${cleaned} expired entries`);
            resolve(cleaned);
          });
        } else {
          resolve(0);
        }
      });
    });
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.storageKey, (result) => {
        const cache = result[this.storageKey] || {};
        const now = Date.now();
        
        const stats = {
          total: 0,
          active: 0,
          expired: 0,
          byType: {}
        };

        for (const key in cache) {
          stats.total++;
          
          const [type] = key.split(':');
          stats.byType[type] = (stats.byType[type] || 0) + 1;

          if (now > cache[key].expiresAt) {
            stats.expired++;
          } else {
            stats.active++;
          }
        }

        resolve(stats);
      });
    });
  }
}
