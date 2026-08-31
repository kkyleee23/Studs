import { supabase } from './supabaseClient.js';

export async function listByClass(classId) {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('class_id', classId)
        .order('position', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function insertCategory(row) {
    const { data, error } = await supabase
        .from('categories')
        .insert(row)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateCategory(id, patch) {
    const { data, error } = await supabase
        .from('categories')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteCategory(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
}
