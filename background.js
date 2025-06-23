chrome.commands.onCommand.addListener(async (command) => {
  if (command === "add-to-quicklist") {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    if (!quicklist.find(t => t.id === tab.id)) {
      quicklist.push({id: tab.id, title: tab.title, url: tab.url});
      await chrome.storage.local.set({quicklist});
    }
  } else if (command.startsWith("jump-to-tab-")) {
    const index = parseInt(command.slice(-1)) - 1;
    const quicklist = (await chrome.storage.local.get("quicklist")).quicklist || [];
    if (quicklist[index]) {
      try {
        await chrome.tabs.update(quicklist[index].id, {active: true});
        const tab = await chrome.tabs.get(quicklist[index].id);
        await chrome.windows.update(tab.windowId, {focused: true});
      } catch (e) {
        console.error("Tab may have been closed.", e);
      }
    }
  }
});
