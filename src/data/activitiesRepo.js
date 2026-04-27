// Data Layer — activities CRUD.
import { supabase } from './supabaseClient.js';

export async function listByClass(classId) {
    const { data, error } = await supabase
        .from('activities')
        .select('*, category:categories(id,name,weight)')
        .eq('class_id', classId)
        .order('due_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
}

export async function insertActivity(row) {
    const { data, error } = await supabase
        .from('activities')
        .insert(row)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteActivity(id) {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
}
