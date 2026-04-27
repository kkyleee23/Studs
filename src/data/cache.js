// Tiny localStorage cache with TTL + offline fallback.
//
// Pattern:
//   - Within ttlMs of the last successful fetch, return cached value (skip network).
//   - Otherwise hit the network; on success update the cache; on failure fall back to cache.
//   - On total miss (no cache AND network fails) the underlying error is thrown.
//
// Writes that change a cached query MUST call invalidate(prefix) to drop the stale entry.

const PREFIX = 'studs:cache:';

function readCache(key) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.t !== 'number') return null;
        return parsed;
    } catch { return null; }
}

function writeCache(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch {
        // Quota exceeded or storage disabled — drop the cache silently.
    }
}

export async function getOrFetch(key, fetcher, ttlMs = 30_000) {
    const cached = readCache(key);
    if (cached && Date.now() - cached.t < ttlMs) return cached.v;
    try {
        const fresh = await fetcher();
        writeCache(key, fresh);
        return fresh;
    } catch (e) {
        if (cached) return cached.v;
        throw e;
    }
}

// Drop every cached entry whose key starts with the given prefix.
// Pass an empty string to clear everything (e.g. on sign-out).
export function invalidate(prefix = '') {
    const full = PREFIX + prefix;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(full)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
}

export function clearAll() { invalidate(''); }
