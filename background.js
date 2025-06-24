// Handle commands from both the commands API and content script messages
async function executeCommand(command) {
  if (command === "add-to-quicklist") {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    if (!quicklist.find(t => t.id === tab.id)) {
      quicklist.push({id: tab.id, title: tab.title, url: tab.url});
      await chrome.storage.local.set({quicklist});
      
      // Send flash message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {action: 'showFlash'});
      } catch (e) {
        console.log('Could not send flash message to tab:', e.message);
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
        console.log("Tab was closed, opening new tab with URL:", quicklist[index].url);
        // Tab was closed, open a new tab with the stored URL
        const newTab = await chrome.tabs.create({url: quicklist[index].url, active: true});
        // Update the quicklist item with the new tab ID
        quicklist[index].id = newTab.id;
        quicklist[index].title = newTab.title || quicklist[index].title;
        await chrome.storage.local.set({quicklist});
      }
    }
  }
}

// Reconnect quicklist to existing tabs after browser restart
async function reconnectQuicklistTabs() {
  console.log('Reconnecting quicklist to existing tabs...');
  const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
  if (quicklist.length === 0) return;

  const tabs = await chrome.tabs.query({});
  console.log(`Found ${tabs.length} tabs, quicklist has ${quicklist.length} items`);
  
  let updated = false;
  for (const quicklistItem of quicklist) {
    // Find existing tab with matching URL
    const matchingTab = tabs.find(tab => tab.url === quicklistItem.url);
    if (matchingTab && matchingTab.id !== quicklistItem.id) {
      console.log(`Reconnecting quicklist item "${quicklistItem.title}" to existing tab ${matchingTab.id}`);
      quicklistItem.id = matchingTab.id;
      quicklistItem.title = matchingTab.title;
      updated = true;
    }
  }
  
  if (updated) {
    await chrome.storage.local.set({quicklist});
    console.log('Quicklist reconnected to existing tabs');
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
  await reconnectQuicklistTabs();
  await injectIntoExistingTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await reconnectQuicklistTabs();
  await injectIntoExistingTabs();
});

// Keep the original commands API for Chrome internal pages
chrome.commands.onCommand.addListener(executeCommand);

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeCommand') {
    executeCommand(request.command);
    sendResponse({success: true});
  }
});
