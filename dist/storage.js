/** Fallback adapter: works in SSR and when Storage is blocked (private mode, iframes). */
function memoryAdapter() {
    const map = new Map();
    return {
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => void map.set(k, v),
        removeItem: (k) => void map.delete(k),
    };
}
/** Some browsers throw on `localStorage` access rather than returning null. */
function safeWebStorage(pick) {
    try {
        const store = pick();
        const probe = '__esdk_probe__';
        store.setItem(probe, '1');
        store.removeItem(probe);
        return store;
    }
    catch {
        return memoryAdapter();
    }
}
export function resolveStorage(storage) {
    if (storage && typeof storage === 'object')
        return storage;
    if (typeof window === 'undefined')
        return memoryAdapter();
    switch (storage ?? 'local') {
        case 'memory':
            return memoryAdapter();
        case 'session':
            return safeWebStorage(() => window.sessionStorage);
        default:
            return safeWebStorage(() => window.localStorage);
    }
}
export function loadSession(store, key) {
    const raw = store.getItem(key);
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.token ? parsed : null;
    }
    catch {
        // Corrupt entry — drop it rather than wedging every future load.
        store.removeItem(key);
        return null;
    }
}
export function saveSession(store, key, session) {
    try {
        store.setItem(key, JSON.stringify(session));
    }
    catch {
        // Quota or a blocked store: the session still works for this page life.
    }
}
export function clearSession(store, key) {
    try {
        store.removeItem(key);
    }
    catch {
        /* nothing useful to do */
    }
}
/** ms until the access token expires; Infinity when the server sent no expiry. */
export function millisUntilExpiry(session) {
    if (!session.expires_at)
        return Number.POSITIVE_INFINITY;
    const at = Date.parse(session.expires_at);
    if (Number.isNaN(at))
        return Number.POSITIVE_INFINITY;
    return at - Date.now();
}
//# sourceMappingURL=storage.js.map