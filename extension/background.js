// Background service worker for LeadScout PRO AI extension

// Install extension
chrome.runtime.onInstalled.addListener((info) => {
  if (info.reason === 'install') {
    // Set default API URL
    chrome.storage.local.set({
      apiUrl: 'http://localhost:3000'
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openQuickAdd') {
    // Open popup with pre-filled data
    chrome.storage.local.set({
      quickAddData: message.data
    });
  }
  return true;
});

// Context menu for quick add
chrome.contextMenus?.create({
  id: 'leadscout-quick-add',
  title: 'Add to LeadScout PRO AI',
  contexts: ['page', 'selection']
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'leadscout-quick-add') {
    const selectedText = info.selectionText || '';
    
    // Extract potential lead info from selection
    const leadData = {
      name: selectedText || tab.title?.split('|')[0]?.trim() || '',
      website: tab.url,
      description: selectedText || '',
    };

    chrome.storage.local.set({
      quickAddData: leadData
    });

    // Open popup
    chrome.action.openPopup?.();
  }
});
