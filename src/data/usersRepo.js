import { supabase } from './supabaseClient.js';

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role:roles(name)')
        .eq('id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function updateFullName(userId, full_name) {
    const { data, error } = await supabase
        .from('users')
        .update({ full_name })
        .eq('id', userId)
        .select()
        .single();
    if (error) throw error;
    return data;
}
