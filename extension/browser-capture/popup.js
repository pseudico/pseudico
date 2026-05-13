/* global chrome, document */

const tokenInput = document.querySelector("#pairing-token");
const bridgeSelect = document.querySelector("#capture-bridge");
const localhostUrlInput = document.querySelector("#localhost-url");
const saveButton = document.querySelector("#save-settings");
const captureLinkButton = document.querySelector("#capture-link");
const captureTaskButton = document.querySelector("#capture-task");
const status = document.querySelector("#status");

init().catch((error) => setStatus(error.message));

saveButton.addEventListener("click", () => {
  void saveSettings();
});

captureLinkButton.addEventListener("click", () => {
  void capture("link");
});

captureTaskButton.addEventListener("click", () => {
  void capture("task");
});

async function init() {
  const settings = await chrome.storage.local.get([
    "pairingToken",
    "captureBridge",
    "localhostUrl"
  ]);

  tokenInput.value = settings.pairingToken ?? "";
  bridgeSelect.value = settings.captureBridge ?? "native";
  localhostUrlInput.value = settings.localhostUrl ?? "";
}

async function saveSettings() {
  await chrome.storage.local.set({
    pairingToken: tokenInput.value.trim(),
    captureBridge: bridgeSelect.value,
    localhostUrl: localhostUrlInput.value.trim()
  });
  setStatus("Settings saved locally.");
}

async function capture(format) {
  await saveSettings();
  setStatus("Capturing...");

  const response = await chrome.runtime.sendMessage({
    type: "capture-active-tab",
    format
  });

  if (response?.ok === true) {
    setStatus(`Captured ${response.data?.title ?? "page"}.`);
    return;
  }

  setStatus(response?.error?.message ?? response?.error ?? "Capture failed.");
}

function setStatus(message) {
  status.textContent = message;
}
