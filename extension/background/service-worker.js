// Background Service Worker - Main background script
import { APIClient } from './api-client.js';
import { CacheManager } from './cache-manager.js';
import { MessageHandler } from './message-handler.js';

// Initialize modules
const apiClient = new APIClient();
const cacheManager = new CacheManager();
const messageHandler = new MessageHandler(apiClient, cacheManager);

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Email Threat Intelligence installed', details);
  
  if (details.reason === 'install') {
    // First time installation
    initializeExtension();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

/**
 * Initialize extension on first install
 */
async function initializeExtension() {
  // Set default settings
  const defaultSettings = {
    apiUrl: 'http://localhost:3000/api',
    enableSenderCheck: true,
    enableUrlCheck: true,
    enableContentAnalysis: true,
    enableAttachmentCheck: true,
    enableVisualWarnings: true,
    autoAnalyze: true,
    cacheEnabled: true,
    logHistory: true
  };

  await chrome.storage.sync.set({
    eti_settings: defaultSettings
  });

  // Initialize cache
  await chrome.storage.local.set({
    eti_cache: {},
    eti_history: []
  });

  console.log('Extension initialized with default settings');
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandler.handleMessage(message, sender)
    .then(response => sendResponse(response))
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Keep channel open for async response
});

/**
 * Handle browser action (extension icon) click
 */
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked', tab);
  // Popup will open automatically due to default_popup in manifest
});

/**
 * Monitor tab updates to detect navigation to Gmail/Outlook
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('mail.google.com') || 
        tab.url.includes('outlook.live.com') ||
        tab.url.includes('outlook.office.com') ||
        tab.url.includes('outlook.office365.com')) {
      console.log('Email client detected:', tab.url);
    }
  }
});

/**
 * Periodic cache cleanup
 */
setInterval(() => {
  cacheManager.cleanup();
  console.log('Cache cleanup completed');
}, 60 * 60 * 1000); // Every hour

/**
 * Handle extension suspension (manifest v3)
 */
self.addEventListener('suspend', () => {
  console.log('Service worker suspending, cleaning up...');
  // Cleanup resources
});

console.log('Email Threat Intelligence service worker started');
