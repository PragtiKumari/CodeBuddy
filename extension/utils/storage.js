export function saveToStorage(key, value) {
  chrome.storage.local.set({ [key]: value });
}

export function getFromStorage(key, callback) {
  chrome.storage.local.get([key], (result) => {
    callback(result[key]);
  });
}
