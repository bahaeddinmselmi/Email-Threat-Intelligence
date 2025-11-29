// Email Parser - Extract email data from DOM
class EmailParser {
  constructor(platform) {
    this.platform = platform; // 'gmail' or 'outlook'
    this.selectors = platform === 'gmail' ? CONSTANTS.GMAIL_SELECTORS : CONSTANTS.OUTLOOK_SELECTORS;
  }

  /**
   * Parse current email from DOM
   */
  parseEmail() {
    try {
      const emailData = {
        sender: this.extractSender(),
        senderName: this.extractSenderName(),
        subject: this.extractSubject(),
        body: this.extractBody(),
        headers: this.extractHeaders(),
        urls: this.extractUrls(),
        attachments: this.extractAttachments(),
        timestamp: Date.now(),
        platform: this.platform,
        metadata: this.extractMetadata()
      };

      // Validate but be more forgiving - if sender is invalid, still try to parse
      try {
        Validators.validateEmailData(emailData);
      } catch (validationError) {
        // If sender validation fails, try to fix common issues
        if (validationError.message.includes('Invalid sender email')) {
          // Try to extract sender differently
          const fallbackSender = this.extractSenderFallback();
          if (fallbackSender && Helpers.isValidEmail(fallbackSender)) {
            const originalSender = emailData.sender;
            emailData.sender = fallbackSender;
            Helpers.log('warn', 'Used fallback sender extraction', { original: originalSender, fallback: fallbackSender });
          } else {
            // Last resort: use a placeholder but continue parsing
            const originalSender = emailData.sender;
            emailData.sender = emailData.sender || 'unknown@example.com';
            Helpers.log('warn', 'Using placeholder sender due to extraction failure', { original: originalSender, final: emailData.sender });
          }
        } else {
          throw validationError;
        }
      }

      return emailData;
    } catch (error) {
      Helpers.log('error', 'Failed to parse email', error);
      return null;
    }
  }

  /**
   * Fallback method to extract sender email
   */
  extractSenderFallback() {
    if (this.platform === 'gmail') {
      // Try multiple Gmail selectors
      const selectors = [
        'span[email]',
        'span.gD',
        'div[role="gridcell"] span[email]',
        'div.gK span[email]',
        'span[data-hovercard-id]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const email = element.getAttribute('email') || element.getAttribute('data-hovercard-id');
          if (email && Helpers.isValidEmail(email)) {
            return email;
          }
        }
      }
      
      // Try to extract from text as last resort
      const textElements = document.querySelectorAll('span.go, div.gK, td.gH span');
      for (const element of textElements) {
        const text = element.textContent;
        const emails = Helpers.extractEmails(text);
        if (emails.length > 0) {
          return emails[0];
        }
      }
    }
    
    return null;
  }

  /**
   * Extract sender email address
   */
  extractSender() {
    let senderElement;
    
    if (this.platform === 'gmail') {
      // Gmail has sender in multiple possible locations
      senderElement = document.querySelector(this.selectors.EMAIL_SENDER) ||
                      document.querySelector('span[email]') ||
                      document.querySelector('div.gD');
      
      if (senderElement) {
        // Try to get email from attribute first
        const email = senderElement.getAttribute('email') ||
                     senderElement.getAttribute('data-hovercard-id');
        if (email && Helpers.isValidEmail(email)) return email;
        
        // Otherwise extract from text
        const text = senderElement.textContent;
        const emails = Helpers.extractEmails(text);
        if (emails.length > 0) return emails[0];
      }
      
      // Try additional Gmail selectors as fallback
      const fallbackSelectors = [
        'div[role="gridcell"] span[email]',
        'div.gK span[email]',
        'span[data-hovercard-id]',
        'span.go',
        'td.gH span'
      ];
      
      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const email = element.getAttribute('email') || element.getAttribute('data-hovercard-id');
          if (email && Helpers.isValidEmail(email)) return email;
          
          const text = element.textContent;
          const emails = Helpers.extractEmails(text);
          if (emails.length > 0) return emails[0];
        }
      }
    } else {
      // Outlook
      senderElement = document.querySelector(this.selectors.EMAIL_SENDER);
      if (senderElement) {
        const text = senderElement.textContent;
        const emails = Helpers.extractEmails(text);
        if (emails.length > 0) return emails[0];
      }
    }

    return 'unknown@unknown.com';
  }

  /**
   * Extract email subject
   */
  extractSubject() {
    const subjectElement = document.querySelector(this.selectors.EMAIL_SUBJECT);
    return subjectElement ? subjectElement.textContent.trim() : 'No Subject';
  }

  /**
   * Extract email body content
   */
  extractBody() {
    const bodyElement = document.querySelector(this.selectors.EMAIL_BODY);
    if (!bodyElement) return '';

    // Get text content, preserving some structure
    const text = bodyElement.innerText || bodyElement.textContent;
    return text.trim();
  }

  /**
   * Extract email headers
   */
  extractHeaders() {
    const headers = {
      from: null,
      to: null,
      replyTo: null,
      received: null,
      spf: null,
      dkim: null,
      dmarc: null
    };

    if (this.platform === 'gmail') {
      // Gmail: Look for "Show original" option or header details
      const headerElements = document.querySelectorAll(this.selectors.EMAIL_HEADERS + ' td');
      headerElements.forEach(td => {
        const text = td.textContent.toLowerCase();
        if (text.includes('from:')) headers.from = td.nextElementSibling?.textContent;
        if (text.includes('to:')) headers.to = td.nextElementSibling?.textContent;
        if (text.includes('reply-to:')) headers.replyTo = td.nextElementSibling?.textContent;
      });

      // Try to extract from expanded header view
      const showOriginalLink = document.querySelector('div[data-tooltip="Show original"]');
      if (showOriginalLink) {
        // Headers available in original view (would need to be clicked)
        headers._hasOriginal = true;
      }
    } else {
      // Outlook
      const headerContainer = document.querySelector(this.selectors.EMAIL_HEADERS);
      if (headerContainer) {
        const text = headerContainer.textContent;
        const emails = Helpers.extractEmails(text);
        if (emails.length > 0) headers.from = emails[0];
      }
    }

    return headers;
  }

  /**
   * Extract all URLs from email body
   */
  extractUrls() {
    const bodyElement = document.querySelector(this.selectors.EMAIL_BODY);
    if (!bodyElement) return [];

    const urls = new Set();
    
    // Extract from links
    const links = bodyElement.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('http')) {
        urls.add(href);
      }
    });

    // Extract from text
    const text = bodyElement.textContent;
    const textUrls = Helpers.extractUrls(text);
    textUrls.forEach(url => urls.add(url));

    return Array.from(urls);
  }

  /**
   * Extract attachment information
   */
  extractAttachments() {
    const attachments = [];
    const attachmentContainer = document.querySelector(this.selectors.ATTACHMENT_LIST);
    
    if (!attachmentContainer) return attachments;

    if (this.platform === 'gmail') {
      const attachmentElements = attachmentContainer.querySelectorAll('div[data-tooltip-class]');
      attachmentElements.forEach(elem => {
        const nameElement = elem.querySelector('span.aV3');
        const sizeElement = elem.querySelector('span.SaH2Ve');
        
        if (nameElement) {
          attachments.push({
            name: nameElement.textContent.trim(),
            size: sizeElement ? sizeElement.textContent.trim() : 'Unknown',
            extension: this.getFileExtension(nameElement.textContent)
          });
        }
      });
    } else {
      // Outlook
      const attachmentElements = attachmentContainer.querySelectorAll('div[role="listitem"]');
      attachmentElements.forEach(elem => {
        const name = elem.getAttribute('aria-label') || elem.textContent.trim();
        attachments.push({
          name: name,
          size: 'Unknown',
          extension: this.getFileExtension(name)
        });
      });
    }

    return attachments;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Extract sender's display name
   */
  extractSenderName() {
    if (this.platform === 'gmail') {
      const nameElement = document.querySelector('span.gD[name]');
      return nameElement ? nameElement.getAttribute('name') : null;
    } else {
      const nameElement = document.querySelector(this.selectors.EMAIL_SENDER);
      if (nameElement) {
        const text = nameElement.textContent;
        // Remove email address from text to get name
        return text.replace(CONSTANTS.PATTERNS.EMAIL, '').trim();
      }
    }
    return null;
  }

  /**
   * Check if email is currently open/visible
   */
  isEmailOpen() {
    const emailView = document.querySelector(this.selectors.EMAIL_VIEW);
    return emailView && emailView.offsetParent !== null;
  }

  /**
   * Get email ID (platform-specific)
   */
  getEmailId() {
    if (this.platform === 'gmail') {
      // Gmail uses message ID in URL
      const match = window.location.hash.match(/#([^/]+)/);
      return match ? match[1] : null;
    } else {
      // Outlook uses item ID
      const match = window.location.pathname.match(/\/([^/]+)$/);
      return match ? match[1] : null;
    }
  }

  /**
   * Extract additional email metadata
   */
  extractMetadata() {
    const body = this.extractBody();
    const subject = this.extractSubject();
    const sender = this.extractSender();
    const senderName = this.extractSenderName();
    const urls = this.extractUrls();
    const attachments = this.extractAttachments();
    const locationHash = (window.location && window.location.hash ? window.location.hash : '').toLowerCase();

    return {
      // Email structure
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
      urlCount: urls.length,
      bodyLength: body.length,
      subjectLength: subject.length,

      // Sender metadata
      senderDomain: this.extractDomain(sender),
      senderNamePresent: !!senderName && senderName.length > 0,
      senderNameMatchesDomain: this.doesNameMatchDomain(senderName, sender),

      // Content structure
      hasHtmlFormatting: this.detectHtmlFormatting(),
      hasImages: this.countImages(),
      hasEmbeddedLinks: urls.length > 0,
      hasReplyTo: !!this.extractHeaders().replyTo,

      // Timing
      receivedTime: this.extractReceivedTime(),
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
      hourOfDay: new Date().getHours(),

      // Recipient info
      recipientCount: this.countRecipients(),
      isBcc: this.checkIfBcc(),
      isReply: subject.toLowerCase().startsWith('re:'),
      isForward: subject.toLowerCase().startsWith('fwd:'),

      // Folder/location info (Gmail spam is a strong risk signal)
      isSpamFolder: locationHash.includes('#spam') || locationHash.includes('/spam')
    };
  }

  /**
   * Extract domain from email address
   */
  extractDomain(email) {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Check if sender name matches domain
   */
  doesNameMatchDomain(name, email) {
    if (!name || !email) return false;
    const domain = this.extractDomain(email);
    if (!domain) return false;
    
    const nameLower = name.toLowerCase();
    const domainLower = domain.toLowerCase();
    
    // For Gmail, the name often won't match "gmail.com" and that's OK
    // Only flag as mismatch if it's clearly trying to impersonate
    if (domainLower === 'gmail.com' || domainLower === 'outlook.com' || 
        domainLower === 'yahoo.com' || domainLower === 'hotmail.com') {
      return true; // Major email providers - name doesn't need to match
    }
    
    // For other domains, check if name contains the domain or vice versa
    return nameLower.includes(domainLower) || domainLower.includes(nameLower);
  }

  /**
   * Detect if email has HTML formatting
   */
  detectHtmlFormatting() {
    const bodyElement = document.querySelector(this.selectors.EMAIL_BODY);
    if (!bodyElement) return false;
    // Check for styled elements
    const styled = bodyElement.querySelectorAll('[style], b, i, strong, em, span, div');
    return styled.length > 5;
  }

  /**
   * Count images in email
   */
  countImages() {
    const bodyElement = document.querySelector(this.selectors.EMAIL_BODY);
    if (!bodyElement) return 0;
    return bodyElement.querySelectorAll('img').length;
  }

  /**
   * Count recipients
   */
  countRecipients() {
    const headers = this.extractHeaders();
    if (!headers.to) return 0;
    // Simple count: split by comma
    return headers.to.split(',').length;
  }

  /**
   * Check if email was BCC'd to user
   */
  checkIfBcc() {
    const headers = this.extractHeaders();
    // Only flag as BCC if we're sure - don't assume based on missing headers
    // Gmail often doesn't expose To field in DOM, so this is unreliable
    return false; // Disable BCC detection for now as it's causing false positives
  }

  /**
   * Extract received time from headers
   */
  extractReceivedTime() {
    const headers = this.extractHeaders();
    if (headers.received) {
      // Try to parse date from received header
      const dateMatch = headers.received.match(/\d{1,2}\s+\w+\s+\d{4}\s+\d{1,2}:\d{2}:\d{2}/);
      return dateMatch ? dateMatch[0] : 'Unknown';
    }
    return 'Unknown';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailParser;
}
