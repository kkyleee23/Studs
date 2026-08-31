import { supabase } from './supabaseClient.js';

export async function listRoster(classId) {
    const { data, error } = await supabase
        .from('enrollments')
        .select('joined_at, student:users(id, full_name, email)')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function countForClasses(classIds) {
    if (!classIds?.length) return 0;
    const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('class_id', classIds);
    if (error) throw error;
    return count ?? 0;
}

export async function listClassIds(classIds) {
    if (!classIds?.length) return [];
    const { data, error } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds);
    if (error) throw error;
    return data ?? [];
}

export async function insertEnrollment({ class_id, student_id }) {
    const { data, error } = await supabase
        .from('enrollments')
        .insert({ class_id, student_id })
        .select()
        .single();
    if (error) throw error;
    return data;
}
