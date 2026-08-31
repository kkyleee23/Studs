import * as usersRepo from '../data/usersRepo.js';
import { currentUserId } from '../data/supabaseClient.js';

let cached = null;

export async function getMyProfile() {
    if (cached) return cached;
    const uid = await currentUserId();
    if (!uid) return null;
    const data = await usersRepo.getProfile(uid);
    cached = data ? { ...data, role: data.role?.name ?? 'student' } : null;
    return cached;
}

export function clearProfileCache() { cached = null; }
