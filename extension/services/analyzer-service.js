// Analyzer Service - Client-side email analysis (no backend needed)
class AnalyzerService {
  constructor() {
    this.dnsService = new DNSService();
    this.threatIntel = new ThreatIntelService();
  }

  /**
   * Analyze complete email
   */
  async analyzeEmail(emailData) {
    try {
      Helpers.log('info', 'Starting email analysis (client-side)');

      // Run all analyses in parallel
      const [
        senderAnalysis,
        urlAnalysis,
        contentAnalysis,
        attachmentAnalysis
      ] = await Promise.all([
        this.analyzeSender(emailData),
        this.analyzeUrls(emailData.urls || []),
        this.analyzeContent(emailData),
        this.analyzeAttachments(emailData.attachments || [])
      ]);

      // Calculate threat score (include metadata for stronger heuristics)
      const threatScore = this.calculateThreatScore({
        senderAnalysis,
        urlAnalysis,
        contentAnalysis,
        attachmentAnalysis,
        metadata: emailData.metadata || {}
      });

      return {
        threatScore: threatScore.score,
        threatLevel: threatScore.level,
        recommendation: threatScore.recommendation,
        reasons: threatScore.reasons,
        senderAnalysis,
        urlAnalysis,
        contentAnalysis,
        attachmentAnalysis,
        domainInfo: senderAnalysis.domainInfo,
        emailMetadata: emailData.metadata
      };

    } catch (error) {
      Helpers.log('error', 'Analysis failed', error);
      return {
        threatScore: 50,
        threatLevel: 'SUSPICIOUS',
        recommendation: 'Analysis incomplete - exercise caution',
        reasons: ['Analysis error: ' + error.message],
        error: error.message
      };
    }
  }

  /**
   * Analyze sender
   */
  async analyzeSender(emailData) {
    const sender = emailData.sender;
    const domain = Helpers.extractDomain(sender);
    const metadata = emailData.metadata || {};

    try {
      let spf, dkim, dmarc;
      try {
        spf = await this.dnsService.checkSPF(domain);
      } catch (e) {
        spf = 'error';
      }
      
      dkim = 'Not checked'; // Requires email headers
      
      try {
        dmarc = await this.dnsService.checkDMARC(domain);
      } catch (e) {
        dmarc = 'error';
      }
      const [mxRecords, domainInfo] = await Promise.all([
        this.dnsService.getMXRecords(domain),
        this.threatIntel.getDomainInfo(domain)
      ]);

      // Additional sender risk signals from metadata
      const senderRisks = [];
      if (!metadata.senderNamePresent) {
        senderRisks.push('No sender display name');
      }
      if (metadata.senderNamePresent && !metadata.senderNameMatchesDomain) {
        senderRisks.push('Sender name does not match domain');
      }
      if (metadata.isBcc) {
        senderRisks.push('Email was BCC\'d (unusual)');
      }

      return {
        email: sender,
        domain: domain,
        spf: spf,
        dkim: 'not_checked', // Can't verify without email headers in this client-only mode
        dmarc: dmarc,
        mxRecords: mxRecords,
        domainInfo: domainInfo,
        reputation: this.calculateSenderReputation(spf, dmarc, domainInfo),
        senderRisks: senderRisks
      };

    } catch (error) {
      return {
        email: sender,
        domain: domain,
        spf: 'error',
        dkim: 'not_checked',
        dmarc: 'error',
        reputation: 'unknown',
        senderRisks: []
      };
    }
  }

  /**
   * Analyze URLs
   */
  async analyzeUrls(urls) {
    if (!urls || urls.length === 0) {
      return { urls: [], dangerousUrls: [], dangerousCount: 0 };
    }

    try {
      const urlResults = await Promise.all(
        urls.slice(0, 10).map(url => this.analyzeUrl(url))
      );

      const dangerousUrls = urlResults
        .filter(r => r.dangerous)
        .map(r => r.url);

      return {
        urls: urlResults,
        dangerousUrls: dangerousUrls,
        dangerousCount: dangerousUrls.length
      };

    } catch (error) {
      return { urls: [], dangerousUrls: [], dangerousCount: 0, error: error.message };
    }
  }

  /**
   * Analyze single URL (basic version that doesn't require network)
   */
  async analyzeUrlBasic(url) {
    try {
      const urlObj = new URL(url);
      let riskScore = 0;
      const flags = [];

      // Basic pattern checks (no network calls)
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.club', '.work', '.info', '.click', '.country'];
      if (suspiciousTLDs.some(tld => urlObj.hostname.endsWith(tld))) {
        riskScore += 20;
        flags.push('Suspicious TLD');
      }

      // IP address instead of domain
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(urlObj.hostname)) {
        riskScore += 30;
        flags.push('URL uses IP address');
      }

      // Not using HTTPS
      if (urlObj.protocol === 'http:') {
        riskScore += 15;
        flags.push('Not using HTTPS');
      }

      // Suspicious keywords
      const keywords = ['login', 'verify', 'account', 'secure', 'banking', 'paypal', 'password'];
      const combined = (urlObj.hostname + urlObj.pathname + urlObj.search).toLowerCase();
      const foundKeywords = keywords.filter(k => combined.includes(k));
      
      if (foundKeywords.length > 0) {
        riskScore += 10;
        flags.push(`Suspicious keywords: ${foundKeywords.join(', ')}`);
      }

      return {
        url: url,
        resolvedUrl: url,
        dangerous: riskScore >= 40,
        riskScore: riskScore,
        flags: flags
      };

    } catch (error) {
      return {
        url: url,
        dangerous: false,
        riskScore: 0,
        flags: ['Unable to analyze']
      };
    }
  }

  /**
   * Analyze single URL
   */
  async analyzeUrl(url) {
    try {
      let finalUrl = url;
      let redirects = null;

      // Expand shortened URLs before analysis when possible
      try {
        if (typeof CONSTANTS !== 'undefined' &&
            CONSTANTS.PATTERNS &&
            CONSTANTS.PATTERNS.SHORT_URL &&
            CONSTANTS.PATTERNS.SHORT_URL.test(url)) {
          const expanded = await this.threatIntel.expandURL(url);
          if (expanded && expanded !== url) {
            finalUrl = expanded;
            redirects = `${url} → ${expanded}`;
          }
        }
      } catch (e) {
        // URL expansion is best-effort only
      }

      const urlObj = new URL(finalUrl);
      let riskScore = 0;
      const flags = [];

      // Check patterns against the resolved URL
      const checks = await Promise.all([
        this.checkHomoglyphs(finalUrl),
        this.checkUrlStructure(finalUrl),
        this.threatIntel.checkURL(finalUrl),
        this.threatIntel.checkDomain(urlObj.hostname)
      ]);

      const [homoglyph, structure, threatCheck, domainCheck] = checks;

      if (homoglyph.detected) {
        riskScore += 40;
        flags.push('Homoglyph attack detected');
      }

      if (structure.suspicious) {
        riskScore += 30;
        flags.push(...structure.reasons);
      }

      if (!threatCheck.safe) {
        riskScore += 50;
        flags.push(threatCheck.reason || 'Flagged as suspicious');
      }

      if (domainCheck.suspicious) {
        riskScore += 20;
        flags.push(...domainCheck.reasons);
      }

      return {
        url: url,
        resolvedUrl: finalUrl,
        dangerous: riskScore >= 50,
        riskScore: riskScore,
        flags: flags,
        redirects: redirects
      };

    } catch (error) {
      return {
        url: url,
        dangerous: false,
        riskScore: 0,
        flags: ['Unable to analyze']
      };
    }
  }

  /**
   * Check for homoglyph attacks
   */
  async checkHomoglyphs(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Check for non-ASCII characters
      if (/[^\x00-\x7F]/.test(hostname)) {
        return { detected: true };
      }

      return { detected: false };

    } catch (error) {
      return { detected: false };
    }
  }

  /**
   * Check URL structure
   */
  async checkUrlStructure(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const path = urlObj.pathname;
      const query = urlObj.search || '';
      
      const reasons = [];
      let suspicious = false;

      // IP address instead of domain
      if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
        suspicious = true;
        reasons.push('URL uses IP address');
      }

      // Suspicious TLDs
      const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.club', '.work', '.info', '.click', '.country'];
      if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
        suspicious = true;
        reasons.push('Suspicious TLD');
      }

      // Punycode domains (possible homograph attacks)
      if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
        suspicious = true;
        reasons.push('Punycode domain (possible homograph attack)');
      }

      // Excessive subdomains
      if (hostname.split('.').length > 4) {
        suspicious = true;
        reasons.push('Too many subdomains');
      }

      // Suspicious keywords
      const keywords = [
        'login', 'verify', 'account', 'secure', 'banking', 'paypal',
        'reset-password', 'password-reset', 'update-account', 'secure-login',
        'giftcard', 'crypto', 'bitcoin', 'wallet', 'invoice', 'payment-confirmation'
      ];
      const combined = (hostname + path + query).toLowerCase();
      const foundKeywords = keywords.filter(k => combined.toLowerCase().includes(k));
      
      if (foundKeywords.length > 0) {
        suspicious = true;
        reasons.push(`Suspicious keywords: ${foundKeywords.join(', ')}`);
      }

      // @ symbol (phishing technique)
      if (url.includes('@')) {
        suspicious = true;
        reasons.push('URL contains @ symbol');
      }

      // Not using HTTPS
      if (urlObj.protocol === 'http:') {
        suspicious = true;
        reasons.push('Not using HTTPS');
      }

      // Very long, random-looking URLs
      const pathAndQuery = (path + query);
      if (pathAndQuery.length > 80) {
        const lettersOnly = pathAndQuery.replace(/[^a-zA-Z]/g, '');
        if (lettersOnly.length > 40 && /[a-zA-Z]{30,}/.test(lettersOnly)) {
          suspicious = true;
          reasons.push('Very long randomized URL path');
        }
      }

      return { suspicious, reasons };

    } catch (error) {
      return { suspicious: false, reasons: [] };
    }
  }

  /**
   * Analyze content for phishing patterns
   */
  async analyzeContent(emailData) {
    const text = `${emailData.subject} ${emailData.body}`.toLowerCase();
    const metadata = emailData.metadata || {};
    const shortBodyWithLinks = metadata.bodyLength < 80 && metadata.urlCount > 0;

    const patterns = [
      { regex: /urgent|immediately|act now|limited time/i, weight: 15, flag: 'Urgency manipulation' },
      { regex: /verify your account|confirm your identity/i, weight: 20, flag: 'Account verification phishing' },
      { regex: /suspended|locked|restricted|terminated/i, weight: 18, flag: 'Fear-based manipulation' },
      { regex: /click here|click below/i, weight: 10, flag: 'Action pressure' },
      { regex: /congratulations|you've won|prize|lottery/i, weight: 15, flag: 'Prize scam' },
      { regex: /password|credential|authentication/i, weight: 20, flag: 'Credential harvesting' },
      { regex: /bank|credit card|payment|billing/i, weight: 15, flag: 'Financial information request' },
      { regex: /dear (customer|user|member)/i, weight: 10, flag: 'Generic greeting' },
      { regex: /invoice|payment due|outstanding (invoice|balance)|past due/i, weight: 15, flag: 'Invoice or payment pressure' },
      { regex: /(bitcoin|crypto|usdt|ethereum|wallet)/i, weight: 20, flag: 'Cryptocurrency-related request' },
      { regex: /(gift card|itunes card|google play card|steam card)/i, weight: 20, flag: 'Gift card scam indicators' },
      { regex: /(wire transfer|swift|iban|routing number)/i, weight: 20, flag: 'Wire transfer request' },
      { regex: /(unusual|suspicious) (sign[- ]?in|login)/i, weight: 18, flag: 'Unusual login security alert' },
      { regex: /(mailbox|storage).*(full|almost full|quota)/i, weight: 15, flag: 'Mailbox quota phishing' }
    ];

    let phishingScore = 0;
    const flags = [];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        phishingScore += pattern.weight;
        flags.push(pattern.flag);
      }
    }

    // Check for brand impersonation
    const brands = ['paypal', 'amazon', 'apple', 'microsoft', 'google', 'bank', 'netflix', 'facebook', 'instagram', 'whatsapp', 'uber', 'dhl', 'fedex'];
    const mentionedBrand = brands.find(brand => text.includes(brand));
    const senderDomain = Helpers.extractDomain(emailData.sender);
    
    let impersonation = false;
    if (mentionedBrand && !senderDomain.includes(mentionedBrand)) {
      impersonation = true;
      phishingScore += 30;
      flags.push(`Impersonation: Mentions ${mentionedBrand}`);
    }

    // Additional content risk signals from metadata
    if (metadata.hasAttachments && metadata.attachmentCount > 3) {
      phishingScore += 5;
      flags.push('Multiple attachments (unusual)');
    }
    if (metadata.urlCount > 5) {
      phishingScore += 10;
      flags.push('Many embedded links (suspicious)');
    }
    if (metadata.bodyLength < 80 && metadata.urlCount > 0) {
      phishingScore += 15;
      flags.push('Very short body with links (suspicious)');
    }
    if (metadata.isReply === false && metadata.isForward === false && metadata.recipientCount > 10) {
      phishingScore += 5;
      flags.push('Sent to many recipients');
    }
    if (metadata.hasImages > 5) {
      phishingScore += 5;
      flags.push('Many images in email');
    }

    // If the email is extremely short but contains links, treat it as high-risk content
    if (shortBodyWithLinks && phishingScore < 40) {
      phishingScore = 40;
    }

    return {
      phishingScore: Math.min(100, phishingScore),
      socialEngineering: phishingScore >= 40 ? 'High' : phishingScore >= 20 ? 'Moderate' : 'Low',
      impersonation: impersonation,
      shortBodyWithLinks: shortBodyWithLinks,
      flags: flags
    };
  }

  /**
   * Analyze attachments
   */
  async analyzeAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
      return { attachments: [], dangerousCount: 0 };
    }

    const results = attachments.map(att => this.checkAttachment(att));

    return {
      attachments: results,
      dangerousCount: results.filter(r => r.dangerous).length
    };
  }

  /**
   * Check single attachment
   */
  checkAttachment(attachment) {
    const dangerousExts = ['exe', 'bat', 'cmd', 'scr', 'vbs', 'js', 'jar', 'msi', 'ps1', 'psm1', 'com', 'cpl', 'reg', 'hta', 'lnk', 'pif', 'msc', 'apk', 'sh'];
    const suspiciousExts = ['zip', 'rar', '7z', 'tar', 'gz', 'doc', 'docx', 'docm', 'xls', 'xlsx', 'xlsm', 'ppt', 'pptx', 'pptm', 'pdf', 'iso', 'img'];

    const ext = attachment.extension.toLowerCase();
    let dangerous = false;
    let riskScore = 0;
    const flags = [];

    if (dangerousExts.includes(ext)) {
      dangerous = true;
      riskScore = 90;
      flags.push(`Dangerous file type: .${ext}`);
    } else if (suspiciousExts.includes(ext)) {
      riskScore = 30;
      flags.push(`Requires caution: .${ext}`);
    }

    // Macro-enabled Office documents
    const macroExts = ['docm', 'xlsm', 'pptm'];
    if (macroExts.includes(ext)) {
      dangerous = true;
      riskScore = Math.max(riskScore, 80);
      flags.push('Macro-enabled Office document');
    }

    // Check for double extensions
    if (attachment.name.split('.').length > 2) {
      dangerous = true;
      riskScore += 40;
      flags.push('Double extension detected');
    }

    return {
      name: attachment.name,
      extension: ext,
      dangerous: dangerous,
      riskScore: riskScore,
      flags: flags
    };
  }

  /**
   * Calculate threat score
   */
  calculateThreatScore(analysis) {
    const metadata = analysis.metadata || {};
    const weights = {
      sender: 0.2,
      content: 0.5,
      url: 0.4,
      attachment: 0.4,
      combined: 0.2
    };

    // Sender score
    let senderScore = 0;
    if (analysis.senderAnalysis.spf !== 'pass') senderScore += 40;
    if (analysis.senderAnalysis.dmarc !== 'pass') senderScore += 40;
    if (analysis.senderAnalysis.domainInfo?.suspicious) senderScore += 20;

    // Content score
    const contentScore = analysis.contentAnalysis.phishingScore;

    // URL score
    const urlScore = analysis.urlAnalysis.dangerousCount > 0 ? 80 : 0;

    // Attachment score
    const attachmentScore = analysis.attachmentAnalysis.dangerousCount > 0 ? 90 : 0;

    // Combined factors
    let combinedScore = 0;
    if (analysis.contentAnalysis.impersonation && senderScore > 30) {
      combinedScore += 50;
    }

    // Dangerous URLs combined with other strong signals
    if (analysis.urlAnalysis.dangerousCount > 0) {
      combinedScore += 40;

      if (analysis.contentAnalysis.shortBodyWithLinks) {
        combinedScore += 20;
      }

      if (metadata.isSpamFolder) {
        combinedScore += 20;
      }
    }

    // Calculate weighted total
    let totalScore = Math.round(
      senderScore * weights.sender +
      contentScore * weights.content +
      urlScore * weights.url +
      attachmentScore * weights.attachment +
      combinedScore * weights.combined
    );

    // Ensure strong social engineering is at least suspicious
    if (analysis.contentAnalysis.socialEngineering === 'High') {
      totalScore = Math.max(totalScore, 45);
    } else if (analysis.contentAnalysis.socialEngineering === 'Moderate') {
      totalScore = Math.max(totalScore, 30);
    }

    // Impersonation should usually be dangerous
    if (analysis.contentAnalysis.impersonation) {
      totalScore = Math.max(totalScore, 60);
    }

    // Gmail/Outlook spam folder is a strong risk hint
    if (metadata.isSpamFolder) {
      totalScore = Math.max(totalScore, 40); // at least suspicious
    }

    // Strong rule: dangerous URL + (short body with links OR spam folder) => high score
    if (analysis.urlAnalysis.dangerousCount > 0 &&
        (analysis.contentAnalysis.shortBodyWithLinks || metadata.isSpamFolder)) {
      totalScore = Math.max(totalScore, 75);
    }

    // Clamp score to 0-100
    totalScore = Math.min(100, Math.max(0, totalScore));

    // Collect reasons
    const reasons = [];
    if (senderScore > 20) reasons.push('Sender authentication failed');
    if (contentScore > 30) reasons.push('Phishing patterns detected');
    if (urlScore > 0) reasons.push(`${analysis.urlAnalysis.dangerousCount} dangerous URL(s)`);
    if (attachmentScore > 0) reasons.push(`${analysis.attachmentAnalysis.dangerousCount} dangerous attachment(s)`);
    if (analysis.contentAnalysis.impersonation) reasons.push('Impersonation attempt detected');
    if (analysis.contentAnalysis.shortBodyWithLinks) reasons.push('Short email body with embedded links');
    if (metadata.isSpamFolder) reasons.push('Email is in Spam folder');

    // Determine level and recommendation
    let level, recommendation;
    if (totalScore >= 61) {
      level = 'DANGEROUS';
      recommendation = 'DELETE IMMEDIATELY - Do not interact with this email';
    } else if (totalScore >= 31) {
      level = 'SUSPICIOUS';
      recommendation = 'EXERCISE CAUTION - Verify sender before taking action';
    } else {
      level = 'SAFE';
      recommendation = 'Email appears safe - Standard caution advised';
    }

    return {
      score: totalScore,
      level: level,
      recommendation: recommendation,
      reasons: reasons.slice(0, 5)
    };
  }

  /**
   * Calculate sender reputation
   */
  calculateSenderReputation(spf, dmarc, domainInfo) {
    let score = 0;
    
    if (spf === 'pass') score += 33;
    if (dmarc === 'pass') score += 33;
    if (!domainInfo.suspicious) score += 34;
    
    if (score >= 66) return 'Good';
    if (score >= 33) return 'Moderate';
    return 'Poor';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyzerService;
}
