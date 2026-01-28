# 🛡️ Browser Email Threat Intelligence

> A **privacy-first Chrome Extension** that detects phishing, spoofing, and dangerous links in Gmail & Outlook in real-time.

[![Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Coming_Soon-gray?logo=google-chrome)]()
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Privacy](https://img.shields.io/badge/Privacy-Local_Processing-green?logo=privacy)](https://en.wikipedia.org/wiki/Privacy_by_design)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Overview

**Email Threat Intelligence** is a client-side security tool that acts as your personal cybersecurity analyst. It automatically scans emails for indicators of compromise (IoCs) like:
*   **Spoofed Senders**: Mismatched From/Reply-To headers.
*   **Authentication Failures**: Missing or invalid SPF/DKIM/DMARC signatures.
*   **Deceptive Links**: Homoglyphs, tracking pixels, and known phishing domains.
*   **Malicious Attachments**: Double extensions and executable payloads.

Unlike cloud-based solutions, this extension runs **100% locally** in your browser. No email data is ever sent to external servers.

## ✨ Key Features
- **Real-Time Analysis** - Automatically scans emails as you open them in Gmail & Outlook
- **Phishing Detection** - Identifies social engineering, credential harvesting, and impersonation attempts
- **URL Analysis** - Detects dangerous links, shortened URLs, and suspicious domains
- **Sender Verification** - Validates SPF, DKIM, DMARC authentication
- **Attachment Scanning** - Flags dangerous file types and suspicious patterns
- **Privacy-First** - 100% local analysis, no data sent anywhere
- **Quick URL Check** - Analyze URLs without opening Gmail/Outlook
- **Detailed Reports** - Comprehensive threat breakdown with specific risk factors

## 🚀 Installation

### Option 1: Manual Installation (Developer Mode)
1.  Clone this repository:
    ```bash
    git clone https://github.com/bahaeddinmselmi/phishing-detection-chrome-extension.git
    ```
2.  Open `chrome://extensions/` in Chrome.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the `mail-track` folder from this repo.

## 📖 Usage
### Automatic Email Analysis
- Open any email in Gmail or Outlook
- Extension automatically analyzes it
- Threat banner appears with risk level

### Quick URL Check
1. Click extension icon in toolbar
2. Paste any URL
3. Get instant analysis (works anywhere, no Gmail needed)

## 🔍 How It Works
### Analysis Pipeline
1. **Parse** - Extract sender, URLs, attachments, content
2. **Verify** - Check SPF/DKIM/DMARC records (via DNS-over-HTTPS)
3. **Analyze** - Scan for phishing patterns & suspicious URLs
4. **Score** - Calculate combined threat score
5. **Report** - Display results with specific risk factors

### Why Local-Only?
- ✅ No backend server needed
- ✅ All analysis in your browser
- ✅ Email never leaves your computer
- ✅ No API keys required

## ⚙️ Settings
Click extension icon → **Settings** tab to configure:
- **Enable/Disable Checks** - Toggle specific analysis types
- **Auto-Analyze** - Analyze emails automatically
- **Visual Warnings** - Show threat banners
- **History** - Keep analysis history

## 📄 License
MIT
