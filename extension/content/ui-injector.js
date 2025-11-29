// UI Injector - Inject visual warnings and components into email interface
class UIInjector {
  constructor(platform) {
    this.platform = platform;
    this.selectors = platform === 'gmail' ? CONSTANTS.GMAIL_SELECTORS : CONSTANTS.OUTLOOK_SELECTORS;
    this.injectedElements = new Map();
  }

  /**
   * Inject threat banner above email
   */
  injectThreatBanner(threatData) {
    // Remove existing banner if present
    this.removeBanner();

    const banner = this.createThreatBanner(threatData);
    const targetElement = this.findBannerTarget();
    
    if (targetElement) {
      targetElement.insertBefore(banner, targetElement.firstChild);
      this.injectedElements.set('banner', banner);
      
      // Add click handler for details
      const detailsBtn = banner.querySelector('.eti-details-btn');
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => this.showDetailedPanel(threatData));
      }
    }
  }

  /**
   * Create threat banner element
   */
  createThreatBanner(threatData) {
    const banner = document.createElement('div');
    const level = Helpers.getThreatLevel(threatData.threatScore);
    
    banner.className = `${CONSTANTS.UI_CLASSES.BANNER} eti-level-${level.label.toLowerCase()}`;
    banner.style.backgroundColor = level.color;
    
    banner.innerHTML = `
      <div class="eti-banner-content">
        <div class="eti-banner-icon">
          ${this.getIconForLevel(level.label)}
        </div>
        <div class="eti-banner-info">
          <div class="eti-banner-title">
            <strong>Threat Level: ${level.label}</strong>
            <span class="eti-score">Score: ${threatData.threatScore}/100</span>
          </div>
          <div class="eti-banner-message">
            ${this.getBannerMessage(level.label, threatData)}
          </div>
          <div class="eti-banner-reasons">
            ${this.formatReasons(threatData.reasons)}
          </div>
        </div>
        <div class="eti-banner-actions">
          <button class="eti-details-btn">View Details</button>
          <button class="eti-dismiss-btn">×</button>
        </div>
      </div>
    `;

    // Add dismiss handler
    const dismissBtn = banner.querySelector('.eti-dismiss-btn');
    dismissBtn.addEventListener('click', () => this.removeBanner());

    return banner;
  }

  /**
   * Get appropriate icon for threat level
   */
  getIconForLevel(level) {
    const icons = {
      'SAFE': '✓',
      'SUSPICIOUS': '⚠',
      'DANGEROUS': '⚠'
    };
    return icons[level] || '?';
  }

  /**
   * Get banner message based on threat level
   */
  getBannerMessage(level, threatData) {
    const messages = {
      'SAFE': 'This email appears to be safe. No threats detected.',
      'SUSPICIOUS': 'This email contains suspicious elements. Exercise caution.',
      'DANGEROUS': '⚠️ WARNING: This email is likely malicious. Do not interact with links or attachments.'
    };
    
    let message = messages[level] || 'Analysis complete.';
    
    if (threatData.recommendation) {
      message += ` <em>${threatData.recommendation}</em>`;
    }
    
    return message;
  }

  /**
   * Format threat reasons
   */
  formatReasons(reasons) {
    if (!reasons || reasons.length === 0) return '';
    
    const topReasons = reasons.slice(0, 3);
    return `<ul class="eti-reasons-list">
      ${topReasons.map(r => `<li>${Helpers.sanitizeHtml(r)}</li>`).join('')}
    </ul>`;
  }

  /**
   * Find target element to inject banner
   */
  findBannerTarget() {
    if (this.platform === 'gmail') {
      return document.querySelector(this.selectors.EMAIL_VIEW) ||
             document.querySelector('div[role="main"]');
    } else {
      return document.querySelector(this.selectors.EMAIL_VIEW) ||
             document.querySelector('div[role="region"]');
    }
  }

  /**
   * Remove existing banner
   */
  removeBanner() {
    const existingBanner = document.querySelector(`.${CONSTANTS.UI_CLASSES.BANNER}`);
    if (existingBanner) {
      existingBanner.remove();
      this.injectedElements.delete('banner');
    }
  }

  /**
   * Show detailed threat panel
   */
  showDetailedPanel(threatData) {
    // Remove existing panel
    this.removeDetailedPanel();

    const panel = this.createDetailedPanel(threatData);
    document.body.appendChild(panel);
    this.injectedElements.set('panel', panel);

    // Add close handler
    const closeBtn = panel.querySelector('.eti-panel-close');
    closeBtn.addEventListener('click', () => this.removeDetailedPanel());
    
    // Close on overlay click
    const overlay = panel.querySelector('.eti-panel-overlay');
    overlay.addEventListener('click', () => this.removeDetailedPanel());
  }

  /**
   * Create detailed threat panel
   */
  createDetailedPanel(threatData) {
    const panel = document.createElement('div');
    panel.className = CONSTANTS.UI_CLASSES.DASHBOARD;
    
    panel.innerHTML = `
      <div class="eti-panel-overlay"></div>
      <div class="eti-panel-container">
        <div class="eti-panel-header">
          <h2>Email Threat Analysis</h2>
          <button class="eti-panel-close">×</button>
        </div>
        <div class="eti-panel-body">
          ${this.createPanelSection('Threat Score', this.formatThreatScore(threatData))}
          ${this.createPanelSection('Sender Analysis', this.formatSenderAnalysis(threatData.senderAnalysis))}
          ${this.createPanelSection('Domain Information', this.formatDomainInfo(threatData.domainInfo))}
          ${threatData.emailMetadata ? this.createPanelSection('Email Metadata', this.formatEmailMetadata(threatData.emailMetadata)) : ''}
          ${this.createPanelSection('Content Analysis', this.formatContentAnalysis(threatData.contentAnalysis))}
          ${this.createPanelSection('URL Analysis', this.formatUrlAnalysis(threatData.urlAnalysis))}
          ${this.createPanelSection('Attachment Analysis', this.formatAttachmentAnalysis(threatData.attachmentAnalysis))}
        </div>
      </div>
    `;

    return panel;
  }

  /**
   * Create panel section
   */
  createPanelSection(title, content) {
    return `
      <div class="eti-panel-section">
        <h3>${title}</h3>
        <div class="eti-panel-section-content">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Format threat score display
   */
  formatThreatScore(threatData) {
    const level = Helpers.getThreatLevel(threatData.threatScore);
    return `
      <div class="eti-score-display">
        <div class="eti-score-meter">
          <div class="eti-score-fill" style="width: ${threatData.threatScore}%; background-color: ${level.color}"></div>
        </div>
        <div class="eti-score-label">${threatData.threatScore}/100 - ${level.label}</div>
        <div class="eti-recommendation">${threatData.recommendation || 'No specific recommendation'}</div>
      </div>
    `;
  }

  /**
   * Format sender analysis
   */
  formatSenderAnalysis(analysis) {
    if (!analysis) return '<em>Not available</em>';
    
    let html = `
      <table class="eti-info-table">
        <tr><td><strong>Email:</strong></td><td>${analysis.email || 'N/A'}</td></tr>
        <tr><td><strong>Domain:</strong></td><td>${analysis.domain || 'N/A'}</td></tr>
        <tr><td><strong>SPF:</strong></td><td>${this.formatCheckResult(analysis.spf)}</td></tr>
        <tr><td><strong>DKIM:</strong></td><td>${analysis.dkim === 'not_checked' ? 'ℹ️ Not checked (requires full email headers)' : this.formatCheckResult(analysis.dkim)}</td></tr>
        <tr><td><strong>DMARC:</strong></td><td>${this.formatCheckResult(analysis.dmarc)}</td></tr>
        <tr><td><strong>Reputation:</strong></td><td>${analysis.reputation || 'Unknown'}</td></tr>
      </table>
    `;

    // Add sender risks if present
    if (analysis.senderRisks && analysis.senderRisks.length > 0) {
      html += `
        <div class="eti-sender-risks">
          <p><strong>⚠️ Sender Risks:</strong></p>
          <ul>
            ${analysis.senderRisks.map(risk => `<li>${risk}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    return html;
  }

  /**
   * Format domain info
   */
  formatDomainInfo(info) {
    if (!info) return '<em>Not available</em>';
    
    return `
      <table class="eti-info-table">
        <tr><td><strong>Domain Age:</strong></td><td>${info.age || 'Unknown'}</td></tr>
        <tr><td><strong>Registrar:</strong></td><td>${info.registrar || 'Unknown'}</td></tr>
        <tr><td><strong>Country:</strong></td><td>${info.country || 'Unknown'}</td></tr>
        <tr><td><strong>Blacklisted:</strong></td><td>${info.blacklisted ? '❌ Yes' : '✅ No'}</td></tr>
      </table>
    `;
  }

  /**
   * Format content analysis
   */
  formatContentAnalysis(analysis) {
    if (!analysis) return '<em>Not available</em>';
    
    return `
      <div class="eti-content-analysis">
        <p><strong>Social Engineering Risk:</strong> ${analysis.socialEngineering || 'Low'}</p>
        <p><strong>Impersonation Detected:</strong> ${analysis.impersonation ? '❌ Yes' : '✅ No'}</p>
        <p><strong>Phishing Indicators:</strong> ${analysis.phishingScore || 0}/100</p>
        ${analysis.flags && analysis.flags.length > 0 ? 
          `<p><strong>Flags:</strong></p><ul>${analysis.flags.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
      </div>
    `;
  }

  /**
   * Format URL analysis
   */
  formatUrlAnalysis(analysis) {
    if (!analysis || !analysis.urls || analysis.urls.length === 0) {
      return '<em>No URLs found</em>';
    }
    
    return `
      <div class="eti-url-list">
        ${analysis.urls.map(url => `
          <div class="eti-url-item ${url.dangerous ? 'dangerous' : 'safe'}">
            <div class="eti-url-link">${Helpers.truncate(url.url, 60)}</div>
            <div class="eti-url-status">${url.dangerous ? '❌ Dangerous' : '✅ Safe'}</div>
            ${url.redirects ? `<div class="eti-url-redirects">Redirects: ${url.redirects}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Format attachment analysis
   */
  formatAttachmentAnalysis(analysis) {
    if (!analysis || !analysis.attachments || analysis.attachments.length === 0) {
      return '<em>No attachments</em>';
    }
    
    return `
      <div class="eti-attachment-list">
        ${analysis.attachments.map(att => `
          <div class="eti-attachment-item ${att.dangerous ? 'dangerous' : 'safe'}">
            <div class="eti-attachment-name">${att.name}</div>
            <div class="eti-attachment-info">
              <span>Type: ${att.extension}</span> | 
              <span>Size: ${att.size}</span> | 
              <span>${att.dangerous ? '❌ Potentially Malicious' : '✅ Safe'}</span>
            </div>
            ${att.malwareDetected ? `<div class="eti-malware-warning">⚠️ Malware detected!</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Format email metadata
   */
  formatEmailMetadata(metadata) {
    if (!metadata) return '<em>Not available</em>';
    
    return `
      <div class="eti-metadata-grid">
        <div class="eti-metadata-item">
          <strong>Attachments:</strong> ${metadata.attachmentCount || 0}
        </div>
        <div class="eti-metadata-item">
          <strong>Embedded Links:</strong> ${metadata.urlCount || 0}
        </div>
        <div class="eti-metadata-item">
          <strong>Recipients:</strong> ${metadata.recipientCount || 1}
        </div>
        <div class="eti-metadata-item">
          <strong>Email Type:</strong> ${metadata.isReply ? 'Reply' : metadata.isForward ? 'Forward' : 'Original'}
        </div>
        <div class="eti-metadata-item">
          <strong>Sender Name:</strong> ${metadata.senderNamePresent ? 'Present' : 'Missing'}
        </div>
        <div class="eti-metadata-item">
          <strong>HTML Formatting:</strong> ${metadata.hasHtmlFormatting ? 'Yes' : 'No'}
        </div>
        <div class="eti-metadata-item">
          <strong>Images:</strong> ${metadata.hasImages || 0}
        </div>
        <div class="eti-metadata-item">
          <strong>Body Length:</strong> ${metadata.bodyLength || 0} chars
        </div>
      </div>
    `;
  }

  /**
   * Format check result (pass/fail)
   */
  formatCheckResult(result) {
    if (result === true || result === 'pass') return '✅ Pass';
    if (result === false || result === 'fail' || result === 'error') return '❌ Fail';
    if (result === 'neutral') return '⚠️ Neutral';
    return 'ℹ️ Not checked';
  }

  /**
   * Remove detailed panel
   */
  removeDetailedPanel() {
    const existingPanel = document.querySelector(`.${CONSTANTS.UI_CLASSES.DASHBOARD}`);
    if (existingPanel) {
      existingPanel.remove();
      this.injectedElements.delete('panel');
    }
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    const spinner = document.createElement('div');
    spinner.className = CONSTANTS.UI_CLASSES.SPINNER;
    spinner.innerHTML = `
      <div class="eti-spinner-content">
        <div class="eti-spinner-icon">⟳</div>
        <div class="eti-spinner-text">Analyzing email security...</div>
      </div>
    `;
    
    const targetElement = this.findBannerTarget();
    if (targetElement) {
      targetElement.insertBefore(spinner, targetElement.firstChild);
      this.injectedElements.set('spinner', spinner);
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    const spinner = document.querySelector(`.${CONSTANTS.UI_CLASSES.SPINNER}`);
    if (spinner) {
      spinner.remove();
      this.injectedElements.delete('spinner');
    }
  }

  /**
   * Highlight dangerous URLs in email body
   */
  highlightDangerousUrls(dangerousUrls) {
    const bodyElement = document.querySelector(this.selectors.EMAIL_BODY);
    if (!bodyElement) return;

    const links = bodyElement.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (dangerousUrls.includes(href)) {
        link.style.border = '2px solid #ef4444';
        link.style.backgroundColor = '#fef2f2';
        link.title = '⚠️ Warning: This URL has been flagged as potentially dangerous';
      }
    });
  }

  /**
   * Clean up all injected elements
   */
  cleanup() {
    this.injectedElements.forEach(element => {
      if (element && element.parentNode) {
        element.remove();
      }
    });
    this.injectedElements.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIInjector;
}
