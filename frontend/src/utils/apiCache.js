/**
 * Simple in-memory API cache with TTL.
 * Stored at module level — survives tab changes / re-renders, resets on page reload.
 * This drastically cuts backend calls when users switch tabs back and forth.
 */

const store = new Map(); // key → { data, expiresAt }

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const cache = {
    /**
     * Get cached value. Returns null if missing or expired.
     */
    get(key) {
        const entry = store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            store.delete(key);
            return null;
        }
        return entry.data;
    },

    /**
     * Store value with optional TTL (ms). Default = 5 min.
     */
    set(key, data, ttl = DEFAULT_TTL_MS) {
        store.set(key, { data, expiresAt: Date.now() + ttl });
    },

    /**
     * Build a cache key from a base path + params object.
     */
    key(path, params = {}) {
        const sorted = Object.keys(params)
            .sort()
            .filter(k => params[k] !== '' && params[k] !== undefined && params[k] !== null)
            .map(k => `${k}=${params[k]}`)
            .join('&');
        return sorted ? `${path}?${sorted}` : path;
    },

    /**
     * Bust all entries matching a prefix (e.g. after admin action).
     */
    bust(prefix) {
        for (const k of store.keys()) {
            if (k.startsWith(prefix)) store.delete(k);
        }
    },
};
