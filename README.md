# 🛡️ Email Threat Intelligence

Real‑time phishing and threat detection for Gmail and Outlook – runs entirely in your browser.

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

### Option 1: Chrome Web Store
Coming soon!

### Option 2: Manual Installation

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `mail-track` folder
6. Done! The extension appears in your toolbar

## 📖 Usage

### Automatic Email Analysis
- Open any email in Gmail or Outlook
- Extension automatically analyzes it
- Threat banner appears with risk level

### View Detailed Analysis
Click **View Details** on the banner to see:
- Sender authentication status (SPF/DKIM/DMARC)
- Domain information & reputation
- URL risk analysis
- Attachment threats
- Phishing indicators

### Quick URL Check
1. Click extension icon in toolbar
2. Paste any URL
3. Get instant analysis (works anywhere, no Gmail needed)

## 🎯 Threat Levels

| Level | Score | Action |
|-------|-------|--------|
| 🟢 **SAFE** | 0-30 | Email appears legitimate |
| 🟡 **SUSPICIOUS** | 31-60 | Verify sender before interacting |
| 🔴 **DANGEROUS** | 61-100 | Delete immediately, do not interact |

## 🔍 How It Works

### Analysis Pipeline
1. **Parse** - Extract sender, URLs, attachments, content
2. **Verify** - Check SPF/DKIM/DMARC records
3. **Analyze** - Scan for phishing patterns & suspicious URLs
4. **Score** - Calculate combined threat score
5. **Report** - Display results with specific risk factors

### Why Local-Only?
- ✅ No backend server needed
- ✅ All analysis in your browser
- ✅ Email never leaves your computer
- ✅ No API keys required
- ✅ Works offline (mostly)

## 🌐 Supported Platforms

- Gmail (mail.google.com)
- Outlook Web (outlook.live.com, outlook.office.com, outlook.office365.com)

## ⚙️ Settings

Click extension icon → **Settings** tab to configure:

- **Enable/Disable Checks** - Toggle specific analysis types
- **Auto-Analyze** - Analyze emails automatically
- **Visual Warnings** - Show threat banners
- **History** - Keep analysis history

## 🔒 Privacy & Security

- ✅ Client-side only - no servers involved
- ✅ No email storage or transmission
- ✅ No tracking or telemetry
- ✅ No external APIs required
- ✅ Open source & auditable

## 📋 What Gets Analyzed

**Sender Information:**
- Email address & domain
- SPF/DKIM/DMARC records
- Domain age & reputation

**Content Patterns:**
- Phishing keywords (verify, confirm, urgent, etc.)
- Social engineering tactics
- Impersonation attempts
- Brand spoofing

**URLs:**
- Shortened links
- Suspicious domains
- IP addresses instead of domains
- Homoglyph attacks
- Dangerous TLDs

**Attachments:**
- Executable files (.exe, .bat, .scr, etc.)
- Macro-enabled documents (.docm, .xlsm)
- Double extensions
- Archive bombs

**Email Structure:**
- Very short body with links
- Spam folder detection
- Multiple recipients
- HTML formatting anomalies

## 🛠️ Technical Details

- **Architecture**: Manifest V3 (modern Chrome extension)
- **Language**: Vanilla JavaScript (no heavy dependencies)
- **Storage**: Browser local storage for settings & history
- **DNS**: Optional DNS-over-HTTPS for record checks

## ⚠️ Limitations

- DKIM verification needs full email headers (not always available)
- Domain age/registrar use local analysis only
- Some checks require DNS queries (optional, can be slow)
- Effectiveness depends on email content & structure

## 🤝 Contributing

Ideas for improvement:
- More phishing patterns
- ML-based scoring
- Additional email providers
- Performance optimizations
- UI enhancements

## 📄 License

This project is licensed under the **MIT License**. See `LICENSE` for details.
