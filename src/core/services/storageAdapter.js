// Storage Adapter — Abstracts sessionStorage access for platform portability
// Default: browser sessionStorage
// React Native: can inject AsyncStorage at startup via setStorageAdapter()

let _adapter = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage?.getItem(key) ?? null;
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage?.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage?.removeItem(key);
  },
};

export function setStorageAdapter(adapter) {
  if (!adapter || typeof adapter.getItem !== 'function' || typeof adapter.setItem !== 'function' || typeof adapter.removeItem !== 'function') {
    throw new Error('Invalid storage adapter: must have getItem, setItem, removeItem methods');
  }
  _adapter = adapter;
}

export const storage = {
  getItem: (key) => _adapter.getItem(key),
  setItem: (key, value) => _adapter.setItem(key, value),
  removeItem: (key) => _adapter.removeItem(key),
};
