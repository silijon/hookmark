// Handle commands from both the commands API and content script messages
async function executeCommand(command) {
  if (command === "add-to-quicklist") {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    if (!quicklist.find(t => t.id === tab.id)) {
      quicklist.push({id: tab.id, title: tab.title, url: tab.url});
      await chrome.storage.local.set({quicklist});
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

// Keep the original commands API for Chrome internal pages
chrome.commands.onCommand.addListener(executeCommand);

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeCommand') {
    executeCommand(request.command);
    sendResponse({success: true});
  }
});
