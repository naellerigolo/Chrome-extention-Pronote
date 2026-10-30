// chrome.storage wrappers with lastError handling, plus item pruning.
function logStorageError(scope, err) {
  console.warn(`[options:${scope}]`, err && err.message ? err.message : err);
}

function localGet(defaults, cb) {
  try {
    chrome.storage.local.get(defaults, (res) => {
      if (chrome.runtime.lastError) logStorageError('localGet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb(res || defaults || {});
    });
  } catch (e) {
    logStorageError('localGet', e);
    if (typeof cb === 'function') cb(defaults || {});
  }
}

function localSet(patch, cb) {
  try {
    chrome.storage.local.set(patch, () => {
      if (chrome.runtime.lastError) logStorageError('localSet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('localSet', e);
    if (typeof cb === 'function') cb();
  }
}

function syncGet(defaults, cb) {
  try {
    chrome.storage.sync.get(defaults, (res) => {
      if (chrome.runtime.lastError) logStorageError('syncGet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb(res || defaults || {});
    });
  } catch (e) {
    logStorageError('syncGet', e);
    if (typeof cb === 'function') cb(defaults || {});
  }
}

function syncSet(patch, cb) {
  try {
    chrome.storage.sync.set(patch, () => {
      if (chrome.runtime.lastError) logStorageError('syncSet', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('syncSet', e);
    if (typeof cb === 'function') cb();
  }
}

function localRemove(keys, cb) {
  try {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) logStorageError('localRemove', chrome.runtime.lastError.message);
      if (typeof cb === 'function') cb();
    });
  } catch (e) {
    logStorageError('localRemove', e);
    if (typeof cb === 'function') cb();
  }
}
