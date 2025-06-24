let selectedIndex = 0;

async function loadQuicklist() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "";
  const { quicklist } = await chrome.storage.local.get("quicklist");
  
  if (!quicklist || quicklist.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.textContent = "No tabs in quicklist";
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
  quicklist.splice(index, 1);
  await chrome.storage.local.set({ quicklist });
  
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
    [quicklist[index], quicklist[newIndex]] = [quicklist[newIndex], quicklist[index]];
    await chrome.storage.local.set({ quicklist });
    
    // Update selected index to follow the moved item
    selectedIndex = newIndex;
    
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
      console.log("Tab was closed, opening new tab with URL:", tab.url);
      // Tab was closed, open a new tab with the stored URL
      const newTab = await chrome.tabs.create({url: tab.url, active: true});
      // Update the quicklist item with the new tab ID
      quicklist[selectedIndex].id = newTab.id;
      quicklist[selectedIndex].title = newTab.title || quicklist[selectedIndex].title;
      await chrome.storage.local.set({quicklist});
      window.close(); // Close popup after opening new tab
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
