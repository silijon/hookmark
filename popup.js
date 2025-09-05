let selectedIndex = 0;
let isUpdatingFromMove = false;

async function loadQuicklist() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "";
  const { quicklist } = await chrome.storage.local.get("quicklist");
  
  if (!quicklist || quicklist.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.textContent = "No pinned tabs";
    emptyMsg.style.color = "light-dark(#666, #999)";
    emptyMsg.style.padding = "10px";
    listEl.appendChild(emptyMsg);
    return;
  }
  
  quicklist.forEach((tab, idx) => {
    const div = document.createElement("div");
    div.className = "tab";
    div.dataset.index = idx;

    const title = document.createElement("span");
    title.textContent = `${idx + 1}: ${tab.title}`;

    const btnContainer = document.createElement("div");
    btnContainer.className = "buttons";

    const upBtn = document.createElement("button");
    upBtn.innerHTML = '<div class="arrow-up"></div>';
    upBtn.className = "up-btn";
    upBtn.title = "Move up (Shift+K)";
    upBtn.addEventListener("click", () => moveTab(idx, -1));

    const downBtn = document.createElement("button");
    downBtn.innerHTML = '<div class="arrow-down"></div>';
    downBtn.className = "down-btn";
    downBtn.title = "Move down (Shift+J)";
    downBtn.addEventListener("click", () => moveTab(idx, 1));

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML = '<div class="cross"></div>';
    removeBtn.className = "remove-btn";
    removeBtn.title = "Remove (X)";
    removeBtn.addEventListener("click", () => removeTab(idx));

    btnContainer.append(upBtn, downBtn, removeBtn);
    div.append(title, btnContainer);
    listEl.appendChild(div);
  });
  
  updateSelection();
}

async function removeTab(index) {
  const { quicklist } = await chrome.storage.local.get("quicklist");
  const tabToRemove = quicklist[index];
  
  // Unpin the tab
  try {
    await chrome.tabs.update(tabToRemove.id, {pinned: false});
  } catch (e) {
    // Tab might be closed already, ignore error
    console.log('Could not unpin tab (might be closed):', e.message);
  }
  
  // Remove from quicklist
  quicklist.splice(index, 1);
  
  // Temporarily disable the storage listener to prevent double rendering
  isUpdatingFromMove = true;
  
  await chrome.storage.local.set({ quicklist });
  
  // Re-enable the listener after a brief delay
  setTimeout(() => {
    isUpdatingFromMove = false;
  }, 100);
  
  // Adjust selected index after removal
  if (selectedIndex >= quicklist.length) {
    selectedIndex = Math.max(0, quicklist.length - 1);
  }
  
  loadQuicklist();
}

async function moveTab(index, direction) {
  const { quicklist } = await chrome.storage.local.get("quicklist");
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < quicklist.length) {
    // Swap items in quicklist
    [quicklist[index], quicklist[newIndex]] = [quicklist[newIndex], quicklist[index]];
    
    // Update selected index to follow the moved item
    selectedIndex = newIndex;
    
    // Temporarily disable the storage listener to prevent double rendering
    isUpdatingFromMove = true;
    
    await chrome.storage.local.set({ quicklist });
    
    // Request background script to reorder the actual pinned tabs
    chrome.runtime.sendMessage({
      action: 'reorderPinnedTabs',
      quicklist: quicklist
    });
    
    // Re-enable the listener after a brief delay
    setTimeout(() => {
      isUpdatingFromMove = false;
    }, 100);
    
    loadQuicklist();
  }
}

function updateSelection() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab, idx) => {
    tab.classList.toggle('selected', idx === selectedIndex);
  });
}

async function jumpToSelectedTab() {
  const { quicklist } = await chrome.storage.local.get("quicklist");
  if (quicklist && quicklist[selectedIndex]) {
    const tab = quicklist[selectedIndex];
    try {
      await chrome.tabs.update(tab.id, {active: true});
      const tabInfo = await chrome.tabs.get(tab.id);
      await chrome.windows.update(tabInfo.windowId, {focused: true});
      window.close(); // Close popup after jumping
    } catch (e) {
      console.log("Tab no longer exists:", e.message);
      // Remove from quicklist if tab doesn't exist
      quicklist.splice(selectedIndex, 1);
      await chrome.storage.local.set({quicklist});
      loadQuicklist();
    }
  }
}

function handleKeydown(event) {
  const tabs = document.querySelectorAll('.tab');
  const maxIndex = tabs.length - 1;
  
  switch(event.key) {
    case 'j':
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex = selectedIndex + 1 > maxIndex ? 0 : selectedIndex + 1;
      updateSelection();
      break;
    case 'k':
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex = selectedIndex - 1 < 0 ? maxIndex : selectedIndex - 1;
      updateSelection();
      break;
    case 'Enter':
      event.preventDefault();
      jumpToSelectedTab();
      break;
    case 'x':
    case 'X':
      event.preventDefault();
      removeTab(selectedIndex);
      break;
    case 'J':
      if (event.shiftKey) {
        event.preventDefault();
        moveTab(selectedIndex, 1); // Move down
      }
      break;
    case 'K':
      if (event.shiftKey) {
        event.preventDefault();
        moveTab(selectedIndex, -1); // Move up
      }
      break;
    case 'Escape':
      event.preventDefault();
      window.close();
      break;
  }
}

document.addEventListener("DOMContentLoaded", loadQuicklist);
document.addEventListener("keydown", handleKeydown);

// Focus the popup for keyboard navigation
window.addEventListener("load", () => {
  document.body.focus();
});

// Listen for storage changes to refresh the list when tabs are added/removed
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.quicklist && !isUpdatingFromMove) {
    loadQuicklist();
  }
});