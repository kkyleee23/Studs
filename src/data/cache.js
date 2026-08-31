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
