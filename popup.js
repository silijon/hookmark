async function loadQuicklist() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "";
  const { quicklist } = await chrome.storage.local.get("quicklist");
  (quicklist || []).forEach((tab, idx) => {
    const div = document.createElement("div");
    div.className = "tab";

    const title = document.createElement("span");
    title.textContent = `${idx + 1}: ${tab.title}`;

    const btnContainer = document.createElement("div");
    btnContainer.className = "buttons";

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeTab(idx));

    const upBtn = document.createElement("button");
    upBtn.textContent = "Up";
    upBtn.addEventListener("click", () => moveTab(idx, -1));

    const downBtn = document.createElement("button");
    downBtn.textContent = "Down";
    downBtn.addEventListener("click", () => moveTab(idx, 1));

    btnContainer.append(removeBtn, upBtn, downBtn);
    div.append(title, btnContainer);
    listEl.appendChild(div);
  });
}

async function removeTab(index) {
  const { quicklist } = await chrome.storage.local.get("quicklist");
  quicklist.splice(index, 1);
  await chrome.storage.local.set({ quicklist });
  loadQuicklist();
}

async function moveTab(index, direction) {
  const { quicklist } = await chrome.storage.local.get("quicklist");
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < quicklist.length) {
    [quicklist[index], quicklist[newIndex]] = [quicklist[newIndex], quicklist[index]];
    await chrome.storage.local.set({ quicklist });
    loadQuicklist();
  }
}

document.addEventListener("DOMContentLoaded", loadQuicklist);
