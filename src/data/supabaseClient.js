import { createClient } from '@supabase/supabase-js';

const RAW_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const RAW_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

export const configError = (!SUPABASE_URL || !RAW_KEY)
    ? 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill both in, then restart the dev server.'
    : null;

export const supabase = createClient(
    SUPABASE_URL || 'http://localhost:54321',
    RAW_KEY || 'missing-anon-key',
    { auth: { persistSession: true, autoRefreshToken: true } }
);

export async function currentUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
}
