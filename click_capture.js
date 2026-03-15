"use strict";
// Privacy-safe click trigger for PRONOTE pages.
(() => {
  const STATE = { enabled: false };

  function loadSetting() {
    try {
      chrome.storage.sync.get({ clickCaptureEnabled: false }, (res) => {
        STATE.enabled = !!res.clickCaptureEnabled;
      });
    } catch { }
  }

  function sendCaptureSignal(kind) {
    if (!STATE.enabled) return;
    const payload = {
      kind: String(kind || 'interaction'),
      time: new Date().toISOString(),
      url: location.href
    };
    try { chrome.runtime.sendMessage({ type: 'PRONOTE_CLICK_CAPTURED', payload }); } catch { }
    try { chrome.runtime.sendMessage({ type: 'PRONOTE_NET_ACTIVITY', when: payload.time, kind: payload.kind }); } catch { }
  }

  function onClick() { sendCaptureSignal('click'); }
  function onSubmit() { sendCaptureSignal('submit'); }

  loadSetting();
  try {
    chrome.storage.onChanged.addListener((chg, area) => {
      if (area === 'sync' && chg.clickCaptureEnabled) {
        STATE.enabled = !!chg.clickCaptureEnabled.newValue;
      }
    });
  } catch { }

  window.addEventListener('click', onClick, { capture: true, passive: true });
  window.addEventListener('submit', onSubmit, { capture: true, passive: true });
})();
