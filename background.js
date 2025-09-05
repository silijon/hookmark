// Track the last active tab for toggle back functionality
let lastActiveTabId = null;
let currentActiveTabId = null;

// Update last active tab when tab activation changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Store the previous tab as the last active tab
  if (currentActiveTabId && currentActiveTabId !== activeInfo.tabId) {
    lastActiveTabId = currentActiveTabId;
    console.log('Toggle back: Previous tab stored:', lastActiveTabId);
  }
  currentActiveTabId = activeInfo.tabId;
});

// Sync pinned tabs to quicklist on startup
async function syncPinnedTabsToQuicklist() {
  console.log('Syncing pinned tabs to quicklist...');
  
  // Get all pinned tabs sorted by index
  const pinnedTabs = await chrome.tabs.query({ pinned: true });
  pinnedTabs.sort((a, b) => a.index - b.index);
  
  // Create quicklist from pinned tabs (no URLs stored, just IDs and titles)
  const quicklist = pinnedTabs.map(tab => ({
    id: tab.id,
    title: tab.title
  }));
  
  await chrome.storage.local.set({ quicklist });
  console.log(`Synced ${quicklist.length} pinned tabs to quicklist`);
}

// Listen for tab updates (including pinned state changes)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if ('pinned' in changeInfo) {
    if (!changeInfo.pinned) {
      // Tab was unpinned - remove from quicklist
      console.log('Tab unpinned, removing from quicklist:', tabId);
      const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
      const newQuicklist = quicklist.filter(t => t.id !== tabId);
      await chrome.storage.local.set({ quicklist: newQuicklist });
    }
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('Tab removed, removing from quicklist if present:', tabId);
  const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
  const newQuicklist = quicklist.filter(t => t.id !== tabId);
  if (newQuicklist.length !== quicklist.length) {
    await chrome.storage.local.set({ quicklist: newQuicklist });
    console.log('Removed tab from quicklist');
  }
});

// Listen for tab movement to maintain correct order
chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.pinned) {
    // If a pinned tab is moved, resync the entire quicklist
    console.log('Pinned tab moved, resyncing quicklist');
    await syncPinnedTabsToQuicklist();
  }
});

// Handle commands from both the commands API and content script messages
async function executeCommand(command) {
  if (command === "add-to-quicklist" || command === "add-to-quicklist-leftmost") {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    const existingIndex = quicklist.findIndex(t => t.id === tab.id);
    
    if (existingIndex === -1) {
      // Tab not in quicklist - pin it and add to quicklist
      try {
        // First pin the tab
        await chrome.tabs.update(tab.id, {pinned: true});
        
        if (command === "add-to-quicklist-leftmost") {
          // Move to leftmost position (index 0)
          await chrome.tabs.move(tab.id, {index: 0});
          
          // Add to quicklist at the beginning
          quicklist.unshift({id: tab.id, title: tab.title});
        } else {
          // Get all pinned tabs to find correct position
          const pinnedTabs = await chrome.tabs.query({ pinned: true });
          pinnedTabs.sort((a, b) => a.index - b.index);
          
          // Move to the end of pinned tabs
          const targetIndex = pinnedTabs.length - 1;
          await chrome.tabs.move(tab.id, {index: targetIndex});
          
          // Add to quicklist at the end
          quicklist.push({id: tab.id, title: tab.title});
        }
        
        await chrome.storage.local.set({quicklist});
        
      } catch (e) {
        console.log('Could not pin tab:', e.message);
      }
      
      // Send flash message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {action: 'showFlash'});
      } catch (e) {
        console.log('Could not send flash message to tab:', e.message);
      }
    } else {
      // Tab already in quicklist - unpin and remove from quicklist
      quicklist.splice(existingIndex, 1);
      await chrome.storage.local.set({quicklist});
      
      // Unpin the tab
      try {
        await chrome.tabs.update(tab.id, {pinned: false});
      } catch (e) {
        console.log('Could not unpin tab:', e.message);
      }
    }
  } else if (command === "open-quicklist") {
    // Open the popup programmatically
    await chrome.action.openPopup();
  } else if (command.startsWith("jump-to-tab-")) {
    const index = parseInt(command.slice(-1)) - 1;
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    if (quicklist[index]) {
      try {
        await chrome.tabs.update(quicklist[index].id, {active: true});
        const tab = await chrome.tabs.get(quicklist[index].id);
        await chrome.windows.update(tab.windowId, {focused: true});
      } catch (e) {
        console.log("Tab no longer exists:", e.message);
        // Remove from quicklist if tab doesn't exist
        quicklist.splice(index, 1);
        await chrome.storage.local.set({quicklist});
      }
    }
  } else if (command === "toggle-back") {
    console.log('Toggle back command received, lastActiveTabId:', lastActiveTabId);
    if (lastActiveTabId) {
      try {
        await chrome.tabs.update(lastActiveTabId, {active: true});
        const tab = await chrome.tabs.get(lastActiveTabId);
        await chrome.windows.update(tab.windowId, {focused: true});
        console.log('Toggle back: Switched to tab', lastActiveTabId);
      } catch (e) {
        console.log("Last active tab was closed or doesn't exist:", e.message);
        lastActiveTabId = null;
      }
    } else {
      console.log('Toggle back: No last active tab stored');
    }
  }
}

// Inject content script into existing tabs when extension is installed/enabled
async function injectIntoExistingTabs() {
  console.log('Injecting content script into existing tabs...');
  const tabs = await chrome.tabs.query({});
  console.log(`Found ${tabs.length} tabs`);
  
  for (const tab of tabs) {
    // Skip chrome:// and other special pages that can't run content scripts
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log(`Injected into tab ${tab.id}: ${tab.url}`);
      } catch (e) {
        // Ignore errors for tabs that can't execute scripts
        console.log(`Could not inject content script into tab ${tab.id}: ${e.message}`);
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await syncPinnedTabsToQuicklist();
  await injectIntoExistingTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncPinnedTabsToQuicklist();
  await injectIntoExistingTabs();
});

// Keep the original commands API for Chrome internal pages
chrome.commands.onCommand.addListener(executeCommand);

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeCommand') {
    executeCommand(request.command);
    sendResponse({success: true});
  } else if (request.action === 'reorderPinnedTabs') {
    // Handle reordering from popup
    reorderPinnedTabs(request.quicklist).then(() => {
      sendResponse({success: true});
    });
    return true; // Keep message channel open for async response
  }
});

// Reorder pinned tabs based on new quicklist order
async function reorderPinnedTabs(quicklist) {
  console.log('Reordering pinned tabs to match quicklist');
  
  // Move each tab to its correct position based on quicklist order
  for (let i = 0; i < quicklist.length; i++) {
    try {
      await chrome.tabs.move(quicklist[i].id, { index: i });
    } catch (e) {
      console.log(`Could not move tab ${quicklist[i].id}:`, e.message);
    }
  }
}