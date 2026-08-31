const UNREACHABLE = "Can't reach the database right now. It may be paused in your Supabase dashboard, or you may be offline.";

export function friendlyError(e) {
    if (!e) return 'Something went wrong.';

    const msg = String(e.message ?? e);
    const status = e.status ?? e.originalError?.status ?? null;
    const code = e.code ?? null;

    if (/failed to fetch|fetch failed|networkerror|load failed|network request failed/i.test(msg)) return UNREACHABLE;
    if ([502, 503, 504, 520, 521, 522, 540].includes(Number(status))) return UNREACHABLE;
    if (Number(status) === 401 || code === 'PGRST301') return "The database rejected this app's key. Check VITE_SUPABASE_ANON_KEY.";
    if (Number(status) === 429 || /rate limit|too many requests/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
    if (/email not confirmed/i.test(msg)) return 'Confirm your email first — check your inbox for the link, then sign in.';
    if (/invalid login credentials/i.test(msg)) return "That email and password don't match an account.";
    if (/already registered|already been registered/i.test(msg)) return 'An account with that email already exists. Try signing in instead.';
    if (/password should be at least/i.test(msg)) return 'Password must be at least 6 characters.';
    if (code === '42501' || /row-level security/i.test(msg)) return "You don't have permission to do that.";
    if (/class not found/i.test(msg)) return "We couldn't find a class with that code. Double-check with your teacher.";

    return msg;
}
