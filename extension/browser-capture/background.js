/* global chrome, fetch */

const NATIVE_HOST = "com.localworkos.capture";
const DEFAULT_LOCALHOST_URL = "http://127.0.0.1:0/capture";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "capture-link",
    title: "Capture page as Local Work OS link",
    contexts: ["page", "selection"]
  });
  chrome.contextMenus.create({
    id: "capture-task",
    title: "Capture page as Local Work OS task",
    contexts: ["page", "selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const format = info.menuItemId === "capture-task" ? "task" : "link";
  await captureActiveTab({ format, tab, selectionText: info.selectionText ?? null });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "capture-active-tab") {
    return false;
  }

  captureActiveTab({ format: message.format === "task" ? "task" : "link" })
    .then((response) => sendResponse(response))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Capture failed."
      })
    );

  return true;
});

async function captureActiveTab({ format, tab, selectionText = null }) {
  const activeTab = tab ?? (await getActiveTab());

  if (activeTab?.id === undefined || activeTab.url === undefined) {
    throw new Error("No active browser tab is available to capture.");
  }

  const settings = await chrome.storage.local.get([
    "pairingToken",
    "captureBridge",
    "localhostUrl",
    "targetContainerId",
    "targetContainerTabId"
  ]);
  const payload = {
    sourceUrl: activeTab.url,
    title: activeTab.title ?? null,
    pageTitle: activeTab.title ?? null,
    selectionText: selectionText ?? (await getSelectionText(activeTab.id)),
    capturedAt: new Date().toISOString()
  };
  const target = {
    containerId: settings.targetContainerId ?? null,
    containerTabId: settings.targetContainerTabId ?? null
  };

  if (settings.captureBridge === "localhost") {
    return await captureViaLocalhost({
      url: settings.localhostUrl ?? DEFAULT_LOCALHOST_URL,
      token: settings.pairingToken,
      format,
      payload,
      target
    });
  }

  return await chrome.runtime.sendNativeMessage(NATIVE_HOST, {
    type: "capture",
    token: settings.pairingToken,
    format,
    payload,
    target
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

async function getSelectionText(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => globalThis.getSelection()?.toString() ?? ""
  });
  const selectionText = typeof result?.result === "string" ? result.result.trim() : "";
  return selectionText.length > 0 ? selectionText : null;
}

async function captureViaLocalhost({ url, token, format, payload, target }) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ format, payload, target })
  });

  return await response.json();
}
