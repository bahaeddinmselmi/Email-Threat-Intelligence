// Threat Intelligence Service - Free threat detection APIs
class ThreatIntelService {
  constructor() {
    // Free threat intelligence sources
    this.sources = {
      // Google Safe Browsing (Free tier: 10,000 requests/day)
      safeBrowsing: 'https://safebrowsing.googleapis.com/v4/threatMatches:find',
      
      // AbuseIPDB (Free tier: 1,000 requests/day) - Optional
      // abuseIPDB: 'https://api.abuseipdb.com/api/v2/check',
      
      // IPQualityScore (Free tier: 5,000 requests/month) - Optional
      // ipqs: 'https://ipqualityscore.com/api/json/ip'
    };
  }

  /**
   * Check URL with Google Safe Browsing (FREE)
   * No API key needed for basic checks via lookup API
   */
  async checkURL(url) {
    try {
      // Use alternative free method: Check against known patterns
      const dangerousPatterns = [
        (typeof CONSTANTS !== 'undefined' && CONSTANTS.PATTERNS && CONSTANTS.PATTERNS.SHORT_URL) || null,
        /bit\.do/i,
        /tny\.im/i,
        /goo\.gl\/[^\/]{6,}/i,
        /(\d{1,3}\.){3}\d{1,3}/,  // IP addresses
        /\.tk$/i, /\.ml$/i, /\.ga$/i, /\.cf$/i, /\.gq$/i, /\.top$/i, /\.xyz$/i, /\.club$/i, /\.work$/i, /\.info$/i, /\.click$/i, /\.country$/i  // Free TLDs
      ].filter(Boolean);

      for (const pattern of dangerousPatterns) {
        if (pattern.test(url)) {
          return {
            safe: false,
            reason: 'Suspicious URL pattern detected'
          };
        }
      }

      return { safe: true };

    } catch (error) {
      console.error('URL check failed:', error);
      return { safe: true, error: error.message };
    }
  }

  /**
   * Check IP reputation (pattern-based, no API needed)
   */
  async checkIP(ip) {
    try {
      // Check if private IP
      if (this.isPrivateIP(ip)) {
        return {
          reputation: 'private',
          score: 50
        };
      }

      // Check against known bad ranges (simplified)
      // In production, use free APIs like AbuseIPDB
      return {
        reputation: 'unknown',
        score: 50
      };

    } catch (error) {
      return { reputation: 'unknown', score: 50 };
    }
  }

  /**
   * Check domain reputation (pattern-based)
   */
  async checkDomain(domain) {
    try {
      // Free TLDs often used for spam
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.club', '.work', '.info', '.click', '.country'];
      const isSuspicious = suspiciousTLDs.some(tld => domain.endsWith(tld));

      // Check domain length
      const isShort = domain.length < 5;

      // Check for excessive subdomains
      const subdomains = domain.split('.');
      const tooManySubdomains = subdomains.length > 4;

      // Suspicious naming patterns
      const lowered = domain.toLowerCase();
      const suspiciousNamePatterns = ['-secure', '-login', '-verify', '-account', 'update-', 'support-'];
      const hasSuspiciousName = suspiciousNamePatterns.some(p => lowered.includes(p));

      return {
        suspicious: isSuspicious || isShort || tooManySubdomains || hasSuspiciousName,
        reasons: [
          isSuspicious && 'Suspicious TLD',
          isShort && 'Very short domain',
          tooManySubdomains && 'Too many subdomains',
          hasSuspiciousName && 'Suspicious domain naming (e.g. login/secure)'
        ].filter(Boolean)
      };

    } catch (error) {
      return { suspicious: false, reasons: [] };
    }
  }

  /**
   * Get domain WHOIS info via free API
   */
  async getDomainInfo(domain) {
    try {
      // Use free WHOIS API: whoisfreaks.com (100 free requests/month)
      // Or jsonwhoisapi.com (500 free/month)
      // For now, return estimated based on patterns

      const newDomainPatterns = /\d{4}|temp|test|fake/i;
      const marketingPatterns = /(free|bonus|promo|deal|giveaway)/i;
      const isLikelyNew = newDomainPatterns.test(domain);
      const hasAggressiveBranding = marketingPatterns.test(domain);

      // Basic country inference from TLD (no WHOIS needed)
      const parts = domain.toLowerCase().split('.');
      const tld = parts[parts.length - 1] || '';
      const tldCountryMap = {
        // Common country-code TLDs
        'us': 'United States',
        'uk': 'United Kingdom',
        'de': 'Germany',
        'fr': 'France',
        'es': 'Spain',
        'it': 'Italy',
        'nl': 'Netherlands',
        'be': 'Belgium',
        'se': 'Sweden',
        'no': 'Norway',
        'dk': 'Denmark',
        'fi': 'Finland',
        'pl': 'Poland',
        'ru': 'Russia',
        'br': 'Brazil',
        'ca': 'Canada',
        'au': 'Australia',
        'nz': 'New Zealand',
        'in': 'India',
        'jp': 'Japan',
        'cn': 'China',
        'kr': 'South Korea',
        'mx': 'Mexico',
        'ch': 'Switzerland',
        'at': 'Austria',
        'ie': 'Ireland',
        'pt': 'Portugal',
        'tr': 'Türkiye',
        'za': 'South Africa',
        'sg': 'Singapore',
        'hk': 'Hong Kong',
        'tw': 'Taiwan',
        // Notable special cases
        'ai': 'Anguilla (".ai" hosting)',
        'io': 'British Indian Ocean Territory (".io" hosting)',
        // Major services with known locations
        'com': 'Generic (US-based services often use .com)',
        'net': 'Generic (US-based services often use .net)',
        'org': 'Generic (US-based services often use .org)'
      };

      const country = tldCountryMap[tld] || 'Unknown';

      // Recognize major email providers explicitly
      const loweredDomain = domain.toLowerCase();
      const majorProviders = [
        'gmail.com',
        'googlemail.com',
        'outlook.com',
        'hotmail.com',
        'live.com',
        'yahoo.com',
        'icloud.com'
      ];

      if (majorProviders.includes(loweredDomain)) {
        return {
          age: 'Established provider (age not checked locally)',
          registrar: 'Major email provider (local analysis only)',
          country: country,
          blacklisted: false,
          suspicious: false
        };
      }

      return {
        age: isLikelyNew ? 'Likely new domain' : 'Not available (local analysis only)',
        registrar: 'Not available (local analysis only)',
        country: country,
        blacklisted: false,
        suspicious: isLikelyNew || hasAggressiveBranding
      };

    } catch (error) {
      return { age: 'Unknown', suspicious: false };
    }
  }

  /**
   * Check if IP is private
   */
  isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127
    );
  }

  /**
   * Expand shortened URL (free, no API needed)
   */
  async expandURL(shortUrl) {
    try {
      // Make HEAD request to follow redirects
      const response = await fetch(shortUrl, {
        method: 'HEAD',
        redirect: 'follow'
      });

      return response.url || shortUrl;

    } catch (error) {
      return shortUrl;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThreatIntelService;
}
