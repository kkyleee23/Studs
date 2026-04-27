// Service Layer — current user profile (joined with role name).
import { supabase, currentUserId } from '../data/supabaseClient.js';

let cached = null;

export async function getMyProfile() {
    if (cached) return cached;
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role:roles(name)')
        .eq('id', uid)
        .maybeSingle();
    if (error) throw error;
    cached = data ? { ...data, role: data.role?.name ?? 'student' } : null;
    return cached;
}

export function clearProfileCache() { cached = null; }
