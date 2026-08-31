import { supabase } from './supabaseClient.js';

export async function signUp({ email, password, full_name, role }) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: full_name ?? null, role: role ?? 'student' } }
    });
    if (error) throw error;
    return data;
}

export async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
}
