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

export async function countForClasses(classIds) {
    if (!classIds?.length) return 0;
    const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);
    if (error) throw error;
    return count ?? 0;
}

export async function listClassIds(classIds) {
    if (!classIds?.length) return [];
    const { data, error } = await supabase
        .from('activities')
        .select('class_id')
        .in('class_id', classIds);
    if (error) throw error;
    return data ?? [];
}

export async function getById(id) {
    const { data, error } = await supabase
        .from('activities')
        .select('id, title, max_score, class_id, category_id, is_extra_credit')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return data;
}
